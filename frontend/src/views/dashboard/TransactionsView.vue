<script setup lang="ts">
import { onMounted, ref, computed, onBeforeUnmount } from "vue";
import { useTransactions } from "@/services/transactions/transactions.store";
import { useAccounts } from "@/services/accounts/accounts.store";
import { formatCentsEUR } from "@/utils/money";
import TransactionModal from "@/components/transactions/TransactionModal.vue";
import CategoryPickerModal from "@/components/transactions/CategoryPickerModal.vue";
import { getDefaultForAccount, setDefaultForAccount } from "@/services/transactions/categoryDefaults.service";
import { useCategories } from "@/services/categories/categories.store";
import CsvImportPanel from "@/components/transactions/CsvImportPanel.vue";
import TransactionsImport from "@/components/transactions/TransactionsImport.vue";


const tx = useTransactions();
const accountsStore = useAccounts();

// expose store refs safely
const { items, loading, error, load, add, remove, setCategory } = tx;
const accounts = accountsStore.items;
const activeId = accountsStore.activeId;
const loadAccounts = accountsStore.load;

// filters
const q = ref("");
const from = ref("");
const to = ref("");

// modal state
const show = ref(false);

const hasAccounts = computed(() => Array.isArray(accounts.value) && accounts.value.length > 0);

// category picker
const catStore = useCategories();
const { roots, load: loadCats } = catStore;

const showCatPicker = ref(false);
const pickingTxId = ref<string | null>(null);

const defaultSubForActive = computed(() =>
    getDefaultForAccount(activeId.value ?? null)
);

// helper: map childId -> "Parent / Child"
const displayNameById = computed(() => {
    const map = new Map<number, string>();
    for (const r of roots.value) {
        for (const c of (r.children || [])) {
            map.set(c.id, `${r.name} / ${c.name}`);
        }
    }
    return map;
});

function openPicker(id: string) {
    pickingTxId.value = id;
    showCatPicker.value = true;
}

async function onPick(payload: { categoryId: number }) {
    if (pickingTxId.value == null) return;
    await setCategory(pickingTxId.value, payload.categoryId);
    showCatPicker.value = false;
}

function onSetDefault(payload: { categoryId: number }) {
    if (activeId.value != null) {
        setDefaultForAccount(activeId.value, payload.categoryId);
    }
}

onMounted(async () => {
    await loadAccounts();
    await loadCats();
    await load({ accountId: activeId.value || undefined });
});

function search() {
    load({
        accountId: activeId.value || undefined,
        q: q.value || undefined,
        from: from.value || undefined,
        to: to.value || undefined,
    });
}

async function onSave(payload: {
    accountId: number;
    date: string;
    amount: number;
    categoryId: number | null;
    description: string | null;
}) {
    await add(payload as any);
}

const W_KEY = "pf_tx_col_widths_v1";
const MIN = [96, 120, 90, 80] as const;        // px minimums for [0]=date,[1]=cat,[2]=amount,[3]=actions
const widths = ref<number[]>(
    (() => {
        try {
            const saved = JSON.parse(localStorage.getItem(W_KEY) || "null");
            if (Array.isArray(saved) && saved.length === 4 && saved.every((n: any) => Number.isFinite(n))) {
                return saved;
            }
        } catch { }
        return [160, 180, 120, 80]; // sensible defaults
    })()
);

// template: fixed px, flexible "1fr" for description
const templateColumns = computed(
    () => `${widths.value[0]}px ${widths.value[1]}px ${widths.value[2]}px 1fr ${widths.value[3]}px`
);

function saveWidths() {
    localStorage.setItem(W_KEY, JSON.stringify(widths.value));
}

type DragState = { idx: 0 | 1 | 2 | 3; startX: number; startW: number };
const drag = ref<DragState | null>(null);
const dragging = computed(() => !!drag.value);

function startResize(idx: 0 | 1 | 2 | 3, e: PointerEvent) {
    // idx corresponds to the *fixed* columns (date,category,amount,actions).
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.value = { idx, startX: e.clientX, startW: widths.value[idx] };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { once: true });
}

function onMove(e: PointerEvent) {
    if (!drag.value) return;
    const dx = e.clientX - drag.value.startX;
    const w = Math.max(MIN[drag.value.idx], Math.round(drag.value.startW + dx));
    widths.value[drag.value.idx] = w;
}

function onUp() {
    drag.value = null;
    window.removeEventListener("pointermove", onMove);
    saveWidths();
}

onBeforeUnmount(() => {
    window.removeEventListener("pointermove", onMove);
});

const childColorById = computed(() => {
    const map = new Map<number, string | null>();
    for (const r of roots.value) {
        const parentColor = r.color ?? null;
        for (const c of (r.children || [])) {
            const color = c.color ?? parentColor ?? null;
            map.set(c.id, color);
        }
    }
    return map;
});
</script>

<template>
    <!-- Page Header-->
    <header class="flex items-center justify-between">
        <h1 class="text-xl font-heading">Gerir transacções</h1>
        <RouterLink class="underline" :to="{ name: 'dashboard' }">Voltar ao painel principal</RouterLink>
    </header>
    <div class="space-y-12 gap-3 mt-12">

        <!-- Transaction Search & Filters-->
        <div class="flex flex-wrap items-end gap-3 justify-between">
            <div class="flex flex-wrap items-end gap-3">
                <div>
                    <label class="block text-sm text-gray-600">Pesquisa</label>
                    <input v-model="q" class="border rounded px-3 py-2" placeholder="Descrição..."
                        @keyup.enter="search" />
                </div>
                <div>
                    <label class="block text-sm text-gray-600">De</label>
                    <input v-model="from" type="date" class="border rounded px-3 py-2" />
                </div>
                <div>
                    <label class="block text-sm text-gray-600">Até</label>
                    <input v-model="to" type="date" class="border rounded px-3 py-2" />
                </div>
                <button class="h-10 px-4 rounded bg-black text-white" @click="search">Filtrar</button>
            </div>

            <button class="h-10 px-4 rounded bg-black text-white" :disabled="!hasAccounts" @click="show = true"
                title="Adicionar transação">
                Adicionar
            </button>
        </div>

        <div v-if="!hasAccounts" class="text-amber-700">
            Crie e selecione uma conta antes de adicionar transações.
        </div>

        <TransactionsImport class="mb-8" />

        <div v-if="loading" class="text-gray-600">A carregar…</div>
        <div v-else-if="error" class="text-red-600">{{ error }}</div>

        <div v-else class="rounded border bg-white overflow-x-auto shadow-md">
            <ul class="min-w-[800px] divide-y" role="rowgroup" :class="{ 'select-none': dragging }">
                <!-- HEADER -->
                <li role="row" class="grid gap-x-4 px-3 py-3 bg-gray-50 text-sm sticky top-0 z-10"
                    :style="{ gridTemplateColumns: templateColumns }">
                    <!-- Date -->
                    <div role="columnheader" class="relative">
                        Data
                        <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(0, e as PointerEvent)" />
                    </div>

                    <!-- Category -->
                    <div role="columnheader" class="relative">
                        Categoria
                        <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(1, e as PointerEvent)" />
                    </div>

                    <!-- Amount -->
                    <div role="columnheader" class="relative">
                        Valor
                        <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(2, e as PointerEvent)" />
                    </div>

                    <!-- Description (flex) -->
                    <div role="columnheader">Descrição</div>

                    <!-- Actions -->
                    <div role="columnheader" class="relative">
                        Ações
                        <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(3, e as PointerEvent)" />
                    </div>
                </li>

                <!-- ROWS -->
                <li v-for="t in (items || [])" :key="t.id" role="row" class="grid gap-x-4 px-3 py-3"
                    :style="{ gridTemplateColumns: templateColumns }">
                    <div class="text-gray-700 whitespace-nowrap">
                        {{ t.date?.slice(0, 10) }}
                    </div>

                    <!-- Category cell -->
                    <div class="truncate flex items-center gap-2">
                        <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300 shrink-0"
                            :style="{ backgroundColor: childColorById.get(t.categoryId || 0) || 'transparent' }"
                            aria-hidden="true" />
                        <button class="underline cursor-pointer truncate" @click="openPicker(t.id)">
                            {{ displayNameById.get(t.categoryId || 0) || "Definir categoria…" }}
                        </button>
                    </div>

                    <div class="whitespace-nowrap">
                        <span :class="t.amount < 0 ? 'text-red-600' : 'text-green-700'">
                            {{ formatCentsEUR(t.amount) }}
                        </span>
                    </div>

                    <div class="text-gray-800 truncate">
                        {{ t.description || "—" }}
                    </div>

                    <div class="whitespace-nowrap">
                        <button class="text-sm underline text-red-700" @click="remove(t.id)">Eliminar</button>
                    </div>
                </li>

                <li v-if="!(items && items.length)" class="px-3 py-16 text-center text-gray-500">
                    Sem transações.
                </li>
            </ul>
        </div>

        <!-- Picker modal + Tx modal (unchanged) -->
        <CategoryPickerModal v-model:open="showCatPicker" :account-id="activeId || null"
            :current-category-id="(items.find(t => t.id === pickingTxId) || {}).categoryId ?? null"
            :default-category-id="defaultSubForActive" @pick="onPick" @set-default="onSetDefault" />

        <TransactionModal v-model:open="show" mode="create" @save="onSave" />
    </div>
</template>

<style scoped>
/* A wide invisible hit-area with a thin light-grey line centered inside it */
.resizer {
    position: absolute;
    top: 0;
    right: -8px;
    /* sits in the middle of the grid gap (gap-x-4 = 16px) */
    width: 16px;
    /* comfy grab area */
    height: 100%;
    cursor: col-resize;
    touch-action: none;
}

.resizer::before {
    content: "";
    position: absolute;
    top: 6px;
    /* leave a bit of breathing room top/bottom */
    bottom: 6px;
    left: 50%;
    width: 1px;
    background: #9da0a5;
    /* Tailwind gray-200 to match border */
    transform: translateX(-50%);
    transition: background 120ms ease;
}

.resizer:hover::before,
.resizer:active::before {
    background: #9ca3af;
    /* gray-400 on hover/drag for feedback */
}
</style>