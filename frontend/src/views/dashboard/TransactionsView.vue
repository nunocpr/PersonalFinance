<script setup lang="ts">
import { onMounted, ref, computed, onBeforeUnmount, watch, nextTick } from "vue";
import { useTransactions } from "@/services/transactions/transactions.store";
import { useAccounts } from "@/services/accounts/accounts.store";
import { formatCentsEUR } from "@/utils/money";
import TransactionModal from "@/components/transactions/TransactionModal.vue";
import CategoryPickerModal from "@/components/transactions/CategoryPickerModal.vue";
import { getDefaultForAccount, setDefaultForAccount } from "@/services/transactions/categoryDefaults.service";
import { useCategories } from "@/services/categories/categories.store";
import TransactionsImportModal from "@/components/transactions/TransactionsImportModal.vue";
import Button from "@/components/ui/Button.vue";
import { Pencil, Trash2 } from "lucide-vue-next";
import CategoryGroups from "@/components/transactions/CategoryGroups.vue"; // <— NEW

/* Stores */
const tx = useTransactions();
const accountsStore = useAccounts();

const {
    items, loading, error, load, add, remove, setCategory,
    total, page, pageSize, totalPages, hasPrev, hasNext, prev, next, setPageSize
} = tx;

const accounts = accountsStore.items;
const activeId = accountsStore.activeId;
const accountsLoaded = accountsStore.loaded;
const loadAccounts = accountsStore.load;

/* Filters & sorting */
const q = ref("");
const from = ref("");
const to = ref("");
const sortBy = ref<"date" | "amount">("date");
const sortDir = ref<"asc" | "desc">("desc");
type GroupKind = "none" | "category" | "month";
const groupBy = ref<GroupKind>("none");

/* Handy filters object for child component */
const filters = computed(() => ({
    q: q.value || undefined,
    from: from.value || undefined,
    to: to.value || undefined,
    sortBy: sortBy.value,
    sortDir: sortDir.value,
}));

/* Scroll helper */
async function withScroll<T>(fn: () => Promise<T>) {
    const y = window.scrollY;
    const res = await fn();
    await nextTick();
    window.scrollTo({ top: y, left: 0 });
    return res;
}

function search() {
    const id = activeId.value;
    if (id == null) return;
    if (groupBy.value === "category") {
        // nothing to do here; CategoryGroups refetches on filters change
        return;
    }
    withScroll(() => load({ accountId: id, ...filters.value, page: 1 }));
}

/* Auto-load list for non-category modes */
watch([accountsLoaded, activeId, q, from, to, sortBy, sortDir, groupBy], () => {
    if (!accountsLoaded.value) return;
    const id = activeId.value;
    if (id == null) {
        items.value = [];
        total.value = 0;
        return;
    }
    if (groupBy.value !== "category") {
        withScroll(() => load({ accountId: id, ...filters.value, page: 1 }));
    }
}, { immediate: true });

/* Modals */
const show = ref(false);
const showImport = ref(false);
const showEdit = ref(false);
const editTx = ref<any | null>(null);

async function onSave(payload: {
    accountId: number; date: string; amount: number;
    categoryId: number | null; description: string | null; notes?: string | null;
}) {
    await add(payload as any);
}
function onEdit(t: any) { editTx.value = { ...t }; showEdit.value = true; }
async function onEditSave(payload: {
    id?: string; accountId?: number; date?: string; amount?: number;
    categoryId?: number | null; description?: string | null; notes?: string | null;
}) {
    const id = editTx.value?.id;
    const anyTx = tx as any;
    if (id && typeof anyTx.update === "function") await anyTx.update(id, payload);
    showEdit.value = false; editTx.value = null;
}

/* Categories (labels/colors) */
const catStore = useCategories();
const { roots, load: loadCats } = catStore;
const showCatPicker = ref(false);
const pickingTxId = ref<string | null>(null);
const defaultSubForActive = computed(() => getDefaultForAccount(activeId.value ?? null));
const displayNameById = computed(() => {
    const map = new Map<number, string>();
    for (const r of roots.value) for (const c of (r.children || [])) map.set(c.id, `${r.name} / ${c.name}`);
    return map;
});
function openPicker(id: string) { pickingTxId.value = id; showCatPicker.value = true; }
async function onPick(payload: { categoryId: number }) { if (pickingTxId.value) await setCategory(pickingTxId.value, payload.categoryId); showCatPicker.value = false; }
function onSetDefault(payload: { categoryId: number }) { if (activeId.value != null) setDefaultForAccount(activeId.value, payload.categoryId); }
const childColorById = computed(() => {
    const map = new Map<number, string | null>();
    for (const r of roots.value) {
        const parentColor = r.color ?? null;
        for (const c of (r.children || [])) map.set(c.id, c.color ?? parentColor ?? null);
    }
    return map;
});

/* Lifecycle */
const hasAccounts = computed(() => Array.isArray(accounts.value) && accounts.value.length > 0);
onMounted(async () => { await loadAccounts(); await loadCats(); });

/* Pagination (main table only) */
const start = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1));
const end = computed(() => Math.min(total.value, page.value * pageSize.value));
function goPrev() { if (!hasPrev.value) return; withScroll(() => Promise.resolve(prev())); }
function goNext() { if (!hasNext.value) return; withScroll(() => Promise.resolve(next())); }
function changePageSize(n: number) { withScroll(() => setPageSize(n)); }

/* Month grouping (client) */
function monthKeyFromISO(iso: string | undefined | null) {
    const d = (iso || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "????-??";
    return d.slice(0, 7);
}
function monthLabel(key: string) {
    const [y, m] = key.split("-").map((n) => parseInt(n, 10));
    const date = new Date(y, (m || 1) - 1, 1);
    return new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(date);
}
const groupedMonth = computed(() => {
    if (groupBy.value !== "month") return null;
    const byMonth = new Map<string, any[]>();
    for (const t of items.value || []) {
        const key = monthKeyFromISO(t.date);
        if (!byMonth.has(key)) byMonth.set(key, []);
        byMonth.get(key)!.push(t);
    }
    return Array.from(byMonth.entries())
        .map(([key, rows]) => ({ key, label: monthLabel(key), rows }))
        .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
});

/* Column resizing (unchanged) */
const W_KEY = "pf_tx_col_widths_v2";
const MIN = [96, 180, 90, 160, 80, 80] as const;
const widths = ref<number[]>(
    (() => {
        try {
            const saved = JSON.parse(localStorage.getItem(W_KEY) || "null");
            if (Array.isArray(saved) && saved.length === 5 && saved.every((n: any) => Number.isFinite(n))) return saved;
        } catch { }
        return [160, 180, 120, 200, 80];
    })()
);
const templateColumns = computed(
    () => `${widths.value[0]}px ${widths.value[1]}px ${widths.value[2]}px 1fr ${widths.value[3]}px ${widths.value[4]}px`
);
function saveWidths() { localStorage.setItem(W_KEY, JSON.stringify(widths.value)); }
type DragState = { idx: 0 | 1 | 2 | 3 | 4; startX: number; startW: number; invert?: boolean };
const drag = ref<DragState | null>(null);
const dragging = computed(() => !!drag.value);
function startResize(idx: 0 | 1 | 2 | 3 | 4, e: PointerEvent, invert = false) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.value = { idx, startX: e.clientX, startW: widths.value[idx], invert };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { once: true });
}
function onMove(e: PointerEvent) {
    if (!drag.value) return;
    const dx = e.clientX - drag.value.startX;
    const delta = drag.value.invert ? -dx : dx;
    widths.value[drag.value.idx] = Math.max(MIN[drag.value.idx], Math.round(drag.value.startW + delta));
}
function onUp() { drag.value = null; window.removeEventListener("pointermove", onMove); saveWidths(); }
onBeforeUnmount(() => { window.removeEventListener("pointermove", onMove); });
</script>

<template>
    <div class="space-y-12 gap-3 mt-2 md:mt-6">
        <!-- Filters -->
        <div class="flex flex-wrap items-end gap-3 justify-between">
            <div class="flex flex-wrap items-end gap-3">
                <div>
                    <label class="block text-sm text-gray-600">Pesquisa</label>
                    <input v-model="q" class="text-sm border rounded px-3 py-1" placeholder="Descrição..."
                        @keyup.enter="search" />
                </div>
                <div>
                    <label class="block text-sm text-gray-600">De</label>
                    <input v-model="from" type="date" class="text-sm border rounded px-3 py-1" />
                </div>
                <div>
                    <label class="block text-sm text-gray-600">Até</label>
                    <input v-model="to" type="date" class="text-sm border rounded px-3 py-1" />
                </div>
                <Button variant="primary" size="xs" title="Filtrar" @click="search">Filtrar</Button>
            </div>

            <div class="flex gap-2">
                <Button variant="primary" size="sm" :disabled="!hasAccounts" title="Importar CSV"
                    @click="showImport = true">Importar</Button>
                <Button variant="primary" size="sm" :disabled="!hasAccounts" title="Adicionar Transacção"
                    @click="show = true">Adicionar</Button>
            </div>
        </div>

        <div v-if="!hasAccounts" class="text-amber-700">Crie e selecione uma conta antes de adicionar transações.</div>
        <div v-else-if="error" class="text-red-600">{{ error }}</div>

        <div class="rounded border bg-white overflow-x-auto shadow-md relative">
            <!-- top loading bar -->
            <div v-show="loading"
                class="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gray-100 overflow-hidden">
                <div class="h-full w-1/3 animate-[txLoading_1.1s_linear_infinite] bg-primary" />
            </div>

            <!-- Header controls (hide list pagination when category mode) -->
            <div class="flex flex-wrap items-center justify-between gap-6 border-b" v-if="total">
                <div class="px-3 py-2 text-sm text-gray-600">
                    Total de {{ total }} transacções
                    <div class="flex items-center gap-2 mt-1">
                        <Button variant="ghost" size="xs" :disabled="!hasPrev" @click="goPrev">Anterior</Button>
                        <span class="text-sm tabular-nums">{{ page }} / {{ totalPages }}</span>
                        <Button variant="ghost" size="xs" :disabled="!hasNext" @click="goNext">Seguinte</Button>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-6 px-3 py-2">
                    <div>
                        <label class="block text-sm text-gray-700">Agrupar por</label>
                        <select v-model="groupBy" class="text-sm border rounded px-3 py-1">
                            <option value="none">Sem agrupamento</option>
                            <option value="category">Categoria</option>
                            <option value="month">Mês</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm text-gray-700">Ordenar</label>
                        <select v-model="sortBy" class="text-sm border rounded px-3 py-1">
                            <option value="date">Data</option>
                            <option value="amount">Valor</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm text-gray-700">Direção</label>
                        <select v-model="sortDir" class="text-sm border rounded px-3 py-1">
                            <option value="desc">Desc</option>
                            <option value="asc">Asc</option>
                        </select>
                    </div>
                </div>
            </div>

            <ul class="min-w-[1000px] divide-y" role="rowgroup" :class="{ 'select-none': dragging }">
                <!-- HEADER row -->
                <li role="row" class="grid gap-x-4 px-3 py-3 bg-gray-50 text-sm sticky top-0 z-10 font-bold"
                    :style="{ gridTemplateColumns: templateColumns }">
                    <div role="columnheader" class="relative">
                        Data <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(0, e as PointerEvent)" />
                    </div>

                    <div role="columnheader" class="relative">
                        Categoria <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(1, e as PointerEvent)" />
                    </div>

                    <div role="columnheader" class="relative">
                        Valor <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(2, e as PointerEvent)" />
                    </div>

                    <div role="columnheader" class="relative">
                        Descrição <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(3, e as PointerEvent, true)" />
                    </div>

                    <div role="columnheader" class="relative">
                        Notas <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(4, e as PointerEvent, true)" />
                    </div>

                    <div role="columnheader" class="relative">Ações</div>
                </li>

                <!-- 1) No grouping -->
                <template v-if="groupBy === 'none'">
                    <li v-for="t in (items || [])" :key="t.id" role="row" class="grid gap-x-4 px-3 py-3"
                        :style="{ gridTemplateColumns: templateColumns }">
                        <div class="text-gray-700 whitespace-nowrap">{{ t.date?.slice(0, 10) }}</div>

                        <div class="truncate flex items-center gap-2">
                            <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300 shrink-0"
                                :style="{ backgroundColor: childColorById.get(t.categoryId || 0) || 'transparent' }" />
                            <Button variant="ghost" size="xs" title="Definir categoria" @click="openPicker(t.id)">
                                {{ displayNameById.get(t.categoryId || 0) || "Definir categoria…" }}
                            </Button>
                        </div>

                        <div class="whitespace-nowrap">
                            <span :class="t.amount < 0 ? 'text-red-600' : 'text-green-700'">{{ formatCentsEUR(t.amount)
                            }}</span>
                        </div>

                        <div class="text-gray-800 truncate">{{ t.description || "—" }}</div>
                        <div class="text-gray-700 truncate">{{ t.notes || "—" }}</div>

                        <div class="whitespace-nowrap flex items-center gap-2">
                            <Button variant="ghost" size="xs" title="Editar" @click="onEdit(t)">
                                <Pencil class="w-4 h-4" />
                            </Button>
                            <Button variant="danger" size="xs" title="Eliminar" @click="remove(t.id)">
                                <Trash2 class="w-4 h-4" />
                            </Button>
                        </div>
                    </li>
                    <li v-if="!(items && items.length)" class="px-3 py-16 text-center text-gray-500">Sem transações.
                    </li>
                </template>

                <!-- 2) Month grouping (client) -->
                <template v-else-if="groupBy === 'month' && groupedMonth">
                    <template v-for="g in groupedMonth" :key="g.key">
                        <li class="px-3 py-2 bg-gray-50 text-sm font-medium flex items-center gap-2">{{ g.label }}</li>
                        <li v-for="t in g.rows" :key="t.id" role="row" class="grid gap-x-4 px-3 py-3"
                            :style="{ gridTemplateColumns: templateColumns }">
                            <div class="text-gray-700 whitespace-nowrap">{{ t.date?.slice(0, 10) }}</div>
                            <div class="truncate flex items-center gap-2">
                                <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300 shrink-0"
                                    :style="{ backgroundColor: childColorById.get(t.categoryId || 0) || 'transparent' }" />
                                {{ displayNameById.get(t.categoryId || 0) || "—" }}
                            </div>
                            <div class="whitespace-nowrap">
                                <span :class="t.amount < 0 ? 'text-red-600' : 'text-green-700'">{{
                                    formatCentsEUR(t.amount) }}</span>
                            </div>
                            <div class="text-gray-800 truncate">{{ t.description || "—" }}</div>
                            <div class="text-gray-700 truncate">{{ t.notes || "—" }}</div>
                            <div class="whitespace-nowrap flex items-center gap-2">
                                <Button variant="ghost" size="xs" title="Editar" @click="onEdit(t)">
                                    <Pencil class="w-4 h-4" />
                                </Button>
                                <Button variant="danger" size="xs" title="Eliminar" @click="remove(t.id)">
                                    <Trash2 class="w-4 h-4" />
                                </Button>
                            </div>
                        </li>
                    </template>
                </template>

                <!-- 3) Category grouping (SERVER) -->
                <template v-else-if="groupBy === 'category'">
                    <CategoryGroups :account-id="activeId || null" :filters="filters"
                        :template-columns="templateColumns" :display-name-by-id="displayNameById"
                        :child-color-by-id="childColorById" @edit="onEdit" @remove="remove" />
                </template>
            </ul>

            <!-- footer only for non-category view -->
            <footer v-if="groupBy !== 'category'"
                class="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t bg-gray-50">
                <div class="text-sm text-gray-600">
                    <template v-if="total">Mostrando {{ start }}–{{ end }} de {{ total }}</template>
                </div>
                <div class="flex items-center gap-2">
                    <label class="text-sm text-gray-600">Por página:</label>
                    <select :value="pageSize"
                        @change="changePageSize(parseInt(($event.target as HTMLSelectElement).value, 10))"
                        class="border rounded px-2 py-1">
                        <option :value="10">10</option>
                        <option :value="20">20</option>
                        <option :value="50">50</option>
                        <option :value="100">100</option>
                    </select>
                    <Button variant="ghost" size="xs" :disabled="!hasPrev" @click="goPrev">Anterior</Button>
                    <span class="text-sm tabular-nums">{{ page }} / {{ totalPages }}</span>
                    <Button variant="ghost" size="xs" :disabled="!hasNext" @click="goNext">Seguinte</Button>
                </div>
            </footer>
        </div>

        <TransactionsImportModal v-model:open="showImport" />
        <CategoryPickerModal v-model:open="showCatPicker" :account-id="activeId || null"
            :current-category-id="(items.find(t => t.id === pickingTxId) || {}).categoryId ?? null"
            :default-category-id="defaultSubForActive" @pick="onPick" @set-default="onSetDefault" />
        <TransactionModal v-model:open="show" mode="create" @save="onSave" />
        <TransactionModal v-model:open="showEdit" mode="edit" :value="editTx" @save="onEditSave" />
    </div>
</template>

<style scoped>
@keyframes txLoading {
    0% {
        transform: translateX(-100%);
    }

    100% {
        transform: translateX(300%);
    }
}

.resizer {
    position: absolute;
    top: 0;
    right: -8px;
    width: 16px;
    height: 100%;
    cursor: col-resize;
    touch-action: none;
}

.resizer::before {
    content: "";
    position: absolute;
    top: 6px;
    bottom: 6px;
    left: 50%;
    width: 1px;
    background: #9da0a5;
    transform: translateX(-50%);
    transition: background 120ms ease;
}

.resizer:hover::before,
.resizer:active::before {
    background: #9ca3af;
}
</style>
