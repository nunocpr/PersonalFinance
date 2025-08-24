<script setup lang="ts">
/* TransactionsView.vue — tidy version
   - No grouping: standard paginated list via transactions.store
   - Group by month: client-side on the current page
   - Group by category: server-side groups + lazy-loaded accordion rows
*/
import { onMounted, ref, computed, onBeforeUnmount, watch, nextTick } from "vue";
import { useTransactions } from "@/services/transactions/transactions.store";
import { useAccounts } from "@/services/accounts/accounts.store";
import { useCategories } from "@/services/categories/categories.store";
import { TransactionService } from "@/services/transactions/transactions.service";
import { getDefaultForAccount, setDefaultForAccount } from "@/services/transactions/categoryDefaults.service";
import { formatCentsEUR } from "@/utils/money";

import Button from "@/components/ui/Button.vue";
import TransactionModal from "@/components/transactions/TransactionModal.vue";
import CategoryPickerModal from "@/components/transactions/CategoryPickerModal.vue";
import TransactionsImportModal from "@/components/transactions/TransactionsImportModal.vue";
import { Pencil, Trash2, ChevronDown } from "lucide-vue-next";

/* ─────────────────────────────────────────────────────────────
   Stores
   ──────────────────────────────────────────────────────────── */
const tx = useTransactions();
const {
    items, loading, error, load, add, remove,
    total, page, pageSize, totalPages, hasPrev, hasNext, prev, next, setPageSize
} = tx;

const accStore = useAccounts();
const { items: accounts, activeId, loaded: accountsLoaded, load: loadAccounts } = accStore;

const catStore = useCategories();
const { roots, load: loadCats } = catStore;

/* ─────────────────────────────────────────────────────────────
   Filters / sorting / grouping
   ──────────────────────────────────────────────────────────── */
const q = ref("");
const from = ref("");
const to = ref("");
const sortBy = ref<"date" | "amount">("date");
const sortDir = ref<"asc" | "desc">("desc");

type GroupKind = "none" | "month" | "category";
const groupBy = ref<GroupKind>("none");

/* ─────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
async function withScroll<T>(fn: () => Promise<T>) {
    const y = window.scrollY;
    const res = await fn();
    await nextTick();
    window.scrollTo({ top: y, left: 0 });
    return res;
}

const hasAccounts = computed(() => Array.isArray(accounts.value) && accounts.value.length > 0);

function search() {
    const id = activeId.value;
    if (id == null) return;

    if (groupBy.value === "category") {
        loadCategoryGroups();
    } else {
        withScroll(() =>
            load({
                accountId: id,
                q: q.value || undefined,
                from: from.value || undefined,
                to: to.value || undefined,
                sortBy: sortBy.value,
                sortDir: sortDir.value,
                page: 1
            })
        );
    }
}

/* Auto-load when account/filters/group change */
watch(
    [accountsLoaded, activeId, q, from, to, sortBy, sortDir, groupBy],
    () => {
        if (!accountsLoaded.value) return;

        const id = activeId.value;
        if (id == null) {
            items.value = [];
            total.value = 0;
            categoryGroups.value = [];
            openGroups.value = new Set();
            groupCache.value = {};
            return;
        }

        if (groupBy.value === "category") {
            loadCategoryGroups();
        } else {
            withScroll(() =>
                load({
                    accountId: id,
                    q: q.value || undefined,
                    from: from.value || undefined,
                    to: to.value || undefined,
                    sortBy: sortBy.value,
                    sortDir: sortDir.value,
                    page: 1
                })
            );
        }
    },
    { immediate: true }
);

/* ─────────────────────────────────────────────────────────────
   Category labels & colors
   ──────────────────────────────────────────────────────────── */
const displayNameById = computed(() => {
    const map = new Map<number, string>();
    for (const r of roots.value) {
        for (const c of (r.children || [])) map.set(c.id, `${r.name} / ${c.name}`);
    }
    return map;
});
const childColorById = computed(() => {
    const map = new Map<number, string | null>();
    for (const r of roots.value) {
        const parentColor = r.color ?? null;
        for (const c of (r.children || [])) map.set(c.id, c.color ?? parentColor ?? null);
    }
    return map;
});

/* ─────────────────────────────────────────────────────────────
   Lifecycle
   ──────────────────────────────────────────────────────────── */
onMounted(async () => {
    await loadAccounts();
    await loadCats();
});

/* ─────────────────────────────────────────────────────────────
   Create / Edit
   ──────────────────────────────────────────────────────────── */
const show = ref(false);
const showEdit = ref(false);
const showImport = ref(false);
const editTx = ref<any | null>(null);

async function onSave(payload: {
    accountId: number; date: string; amount: number;
    categoryId: number | null; description: string | null; notes?: string | null;
}) {
    await add(payload as any);
}

function onEdit(t: any) {
    editTx.value = { ...t };
    showEdit.value = true;
}

async function onEditSave(patch: {
    id?: string; accountId?: number; date?: string; amount?: number;
    categoryId?: number | null; description?: string | null; notes?: string | null;
}) {
    const id = editTx.value?.id;
    const anyTx = tx as any;
    if (id && typeof anyTx.update === "function") await anyTx.update(id, patch);
    showEdit.value = false;
    editTx.value = null;
}

/* Category picker (works for rows from the main table or accordion) */
const showCatPicker = ref(false);
const pickingTxId = ref<string | null>(null);
function openPicker(id: string) {
    pickingTxId.value = id;
    showCatPicker.value = true;
}
async function onPick(payload: { categoryId: number }) {
    if (!pickingTxId.value) return;
    await tx.setCategory(pickingTxId.value, payload.categoryId);
    showCatPicker.value = false;
}
function onSetDefault(payload: { categoryId: number }) {
    if (activeId.value != null) setDefaultForAccount(activeId.value, payload.categoryId);
}
const defaultSubForActive = computed(() => getDefaultForAccount(activeId.value ?? null));

/* For current-category-id in picker (search in main list + group caches) */
const currentCategoryIdForPicker = computed<number | null>(() => {
    const id = pickingTxId.value;
    if (!id) return null;
    const inMain = items.value.find(t => t.id === id);
    if (inMain) return inMain.categoryId ?? null;
    for (const entry of Object.values(groupCache.value)) {
        const hit = entry.items.find(t => t.id === id);
        if (hit) return hit.categoryId ?? null;
    }
    return null;
});

/* ─────────────────────────────────────────────────────────────
   Pagination (main table only)
   ──────────────────────────────────────────────────────────── */
const start = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1));
const end = computed(() => Math.min(total.value, page.value * pageSize.value));

function goPrev() { if (hasPrev.value) withScroll(() => Promise.resolve(prev())); }
function goNext() { if (hasNext.value) withScroll(() => Promise.resolve(next())); }
function changePageSize(n: number) { withScroll(() => setPageSize(n)); }

/* ─────────────────────────────────────────────────────────────
   Group by month (client-side, current page)
   ──────────────────────────────────────────────────────────── */
function monthKeyFromISO(iso?: string | null) {
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

/* ─────────────────────────────────────────────────────────────
   Group by category (SERVER) — accordion (lazy rows)
   ──────────────────────────────────────────────────────────── */
type CategoryGroup = {
    categoryId: number | null;
    count: number;
    sum: number;            // cents (already normalized in backend)
    minDate: string | null;
    maxDate: string | null;
    categoryName: string | null;
    parentName: string | null;
    color: string | null;
};

const categoryGroups = ref<CategoryGroup[]>([]);
const groupsLoading = ref(false);

const catKey = (id: number | null) => (id == null ? "null" : String(id));
const catLabel = (id: number | null, fallback?: string | null) =>
    id == null ? "— Sem categoria —" : displayNameById.value.get(id) || fallback || `#${id}`;

async function loadCategoryGroups() {
    const id = activeId.value;
    if (id == null) return;
    groupsLoading.value = true;
    try {
        const res = await TransactionService.groupByCategory({
            accountId: id,
            q: q.value || undefined,
            from: from.value || undefined,
            to: to.value || undefined,
            sortBy: sortBy.value,
            sortDir: sortDir.value
        });
        openGroups.value = new Set(); // closed by default
        groupCache.value = {};        // reset cached rows for new filter set
        categoryGroups.value = (res?.groups ?? [])
            .sort((a: CategoryGroup, b: CategoryGroup) =>
                catLabel(a.categoryId, a.categoryName).localeCompare(
                    catLabel(b.categoryId, b.categoryName),
                    "pt-PT"
                )
            );
    } finally {
        groupsLoading.value = false;
    }
}

type CacheEntry = { items: any[]; loading: boolean; page: number; pageSize: number; total: number };
const groupCache = ref<Record<string, CacheEntry>>({});
function ensureEntry(catId: number | null): CacheEntry {
    const key = catKey(catId);
    if (!groupCache.value[key]) groupCache.value[key] = { items: [], loading: false, page: 1, pageSize: 50, total: 0 };
    return groupCache.value[key];
}
async function loadGroupItems(catId: number | null, pageOverride?: number) {
    const id = activeId.value;
    if (id == null) return;

    const entry = ensureEntry(catId);
    entry.loading = true;
    try {
        const res = await TransactionService.list({
            accountId: id,
            categoryId: catId as any, // backend supports null to mean “uncategorized”
            q: q.value || undefined,
            from: from.value || undefined,
            to: to.value || undefined,
            sortBy: sortBy.value,
            sortDir: sortDir.value,
            page: pageOverride ?? entry.page,
            pageSize: entry.pageSize
        } as any);

        entry.items = Array.isArray(res?.items) ? res.items : [];
        entry.total = Number(res?.total ?? 0);
        entry.page = Number(res?.page ?? 1);
        entry.pageSize = Number(res?.pageSize ?? entry.pageSize);
        groupCache.value = { ...groupCache.value }; // trigger reactivity
    } finally {
        entry.loading = false;
    }
}

/* Accordion open/close */
const openGroups = ref<Set<string>>(new Set());
function isOpen(catId: number | null) {
    return openGroups.value.has(catKey(catId));
}
function toggleGroup(catId: number | null) {
    const key = catKey(catId);
    if (openGroups.value.has(key)) {
        openGroups.value.delete(key);
    } else {
        openGroups.value.add(key);
        const entry = groupCache.value[key];
        if (!entry || entry.items.length === 0) loadGroupItems(catId);
    }
    openGroups.value = new Set(openGroups.value); // force change
}

/* ─────────────────────────────────────────────────────────────
   Column resizing UI
   ──────────────────────────────────────────────────────────── */
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
function onUp() {
    drag.value = null;
    window.removeEventListener("pointermove", onMove);
    saveWidths();
}
onBeforeUnmount(() => window.removeEventListener("pointermove", onMove));
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
            <div v-show="loading || groupsLoading"
                class="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gray-100 overflow-hidden">
                <div class="h-full w-1/3 animate-[txLoading_1.1s_linear_infinite] bg-primary"></div>
            </div>

            <!-- Summary + controls (hidden in category mode) -->
            <template v-if="groupBy !== 'category' && total">
                <div class="flex flex-wrap items-center justify-between gap-6 border-b">
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
            </template>

            <!-- Header row -->
            <ul class="min-w-[1000px] divide-y" role="rowgroup" :class="{ 'select-none': dragging }">
                <li role="row" class="grid gap-x-4 px-3 py-3 bg-gray-50 text-sm sticky top-0 z-10 font-bold"
                    :style="{ gridTemplateColumns: templateColumns }">
                    <div role="columnheader" class="relative">
                        Data
                        <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(0, e as PointerEvent)" />
                    </div>
                    <div role="columnheader" class="relative">
                        Categoria
                        <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(1, e as PointerEvent)" />
                    </div>
                    <div role="columnheader" class="relative">
                        Valor
                        <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(2, e as PointerEvent)" />
                    </div>
                    <div role="columnheader" class="relative">
                        Descrição
                        <span class="resizer" title="Ajustar largura"
                            @pointerdown="(e) => startResize(3, e as PointerEvent, true)" />
                    </div>
                    <div role="columnheader" class="relative">
                        Notas
                        <span class="resizer" title="Ajustar largura"
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

                <!-- 2) Group by month (client-side) -->
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

                <!-- 3) Group by category (SERVER) — accordion -->
                <template v-else>
                    <li class="px-3 py-2 bg-gray-50 text-sm font-medium flex items-center gap-4">
                        <div>
                            <label class="block text-sm text-gray-700">Agrupar por</label>
                            <select v-model="groupBy" class="text-sm border rounded px-3 py-1">
                                <option value="category">Categoria</option>
                                <option value="none">Sem agrupamento</option>
                                <option value="month">Mês</option>
                            </select>
                        </div>
                    </li>

                    <template v-for="cg in categoryGroups" :key="catKey(cg.categoryId)">
                        <!-- Group header -->
                        <li class="px-3 py-2 bg-gray-50 text-sm font-medium flex items-center justify-between gap-2 cursor-pointer"
                            @click="toggleGroup(cg.categoryId)">
                            <div class="flex items-center gap-2">
                                <ChevronDown class="w-4 h-4 text-gray-500 transition-transform"
                                    :class="isOpen(cg.categoryId) ? 'rotate-180' : ''" />
                                <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300"
                                    :style="{ backgroundColor: cg.color || 'transparent' }" />
                                <span>{{ catLabel(cg.categoryId, cg.categoryName) }}</span>
                            </div>
                            <div class="text-xs text-gray-600">{{ cg.count }} tx • {{ formatCentsEUR(cg.sum) }}</div>
                        </li>

                        <!-- Group rows -->
                        <transition name="acc">
                            <div v-show="isOpen(cg.categoryId)">
                                <!-- optional loading row -->
                                <div v-if="groupCache[catKey(cg.categoryId)]?.loading"
                                    class="px-3 py-3 text-sm text-gray-500">
                                    A carregar…
                                </div>

                                <!-- actual transactions for this category -->
                                <ul>
                                    <li v-for="t in (groupCache[catKey(cg.categoryId)]?.items || [])" :key="t.id"
                                        role="row" class="grid gap-x-4 px-3 py-3"
                                        :style="{ gridTemplateColumns: templateColumns }">
                                        <div class="text-gray-700 whitespace-nowrap">{{ t.date?.slice(0, 10) }}</div>

                                        <div class="truncate flex items-center gap-2">
                                            <span
                                                class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300 shrink-0"
                                                :style="{ backgroundColor: childColorById.get(t.categoryId || 0) || 'transparent' }" />
                                            {{ displayNameById.get(t.categoryId || 0) || "—" }}
                                        </div>

                                        <div class="whitespace-nowrap">
                                            <span :class="t.amount < 0 ? 'text-red-600' : 'text-green-700'">
                                                {{ formatCentsEUR(t.amount) }}
                                            </span>
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
                                </ul>

                                <!-- per-group pager (optional) -->
                                <div v-if="(groupCache[catKey(cg.categoryId)]?.total || 0) >
                                    (groupCache[catKey(cg.categoryId)]?.pageSize || 0)"
                                    class="px-3 py-2 flex items-center gap-2 text-sm text-gray-600">
                                    <Button variant="ghost" size="xs"
                                        :disabled="(groupCache[catKey(cg.categoryId)]?.page || 1) <= 1"
                                        @click.stop="loadGroupItems(cg.categoryId, (groupCache[catKey(cg.categoryId)]?.page || 1) - 1)">Anterior</Button>

                                    <span class="tabular-nums">
                                        {{ groupCache[catKey(cg.categoryId)]?.page || 1 }}
                                        /
                                        {{
                                            Math.max(
                                                1,
                                                Math.ceil(
                                                    (groupCache[catKey(cg.categoryId)]?.total || 0) /
                                        (groupCache[catKey(cg.categoryId)]?.pageSize || 1)
                                        )
                                        )
                                        }}
                                    </span>

                                    <Button variant="ghost" size="xs" :disabled="((groupCache[catKey(cg.categoryId)]?.page || 1) *
                                        (groupCache[catKey(cg.categoryId)]?.pageSize || 1)) >=
                                        (groupCache[catKey(cg.categoryId)]?.total || 0)"
                                        @click.stop="loadGroupItems(cg.categoryId, (groupCache[catKey(cg.categoryId)]?.page || 1) + 1)">Seguinte</Button>
                                </div>
                            </div>
                        </transition>
                    </template>
                </template>
            </ul>

            <!-- Footer (main table only) -->
            <footer v-if="groupBy !== 'category'"
                class="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t bg-gray-50">
                <div class="text-sm text-gray-600" v-if="total">Mostrando {{ start }}–{{ end }} de {{ total }}</div>
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
            :current-category-id="currentCategoryIdForPicker" :default-category-id="defaultSubForActive" @pick="onPick"
            @set-default="onSetDefault" />
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
