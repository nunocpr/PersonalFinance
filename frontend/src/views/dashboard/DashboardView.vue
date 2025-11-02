<script setup lang="ts">
// Yearly-first dashboard...

import { ref, computed, onMounted } from "vue";
import VChart from "vue-echarts";
import { useTransactions } from "@/services/transactions/transactions.store";
import { useAccounts } from "@/services/accounts/accounts.store";
import { useCategories } from "@/services/categories/categories.store";
import { formatCentsEUR } from "@/utils/money";
import Button from "@/components/ui/Button.vue";
import CategorySummaryTable from "@/components/categories/CategorySummaryTable.vue";
import CategoryFilterModal from "@/components/categories/CategoryFilterModal.vue";

// stores
const tx = useTransactions();
const accountsStore = useAccounts();
const catStore = useCategories();

const { load: loadAccounts, activeId } = accountsStore;
const { load: loadCats, roots } = catStore;

// ---- Year control (default = current year)
const today = new Date();
const year = ref<number>(today.getFullYear());
const yearOptions = ref<number[]>([]);

async function initYearOptions() {
    try {
        const maybeYears = (tx as any)?.availableYears;
        if (typeof maybeYears === "function") {
            const ys = await maybeYears();
            if (Array.isArray(ys) && ys.length) {
                yearOptions.value = [...ys].sort((a, b) => b - a);
                if (!yearOptions.value.includes(year.value)) year.value = yearOptions.value[0];
                return;
            }
        }
    } catch { }
    const y = today.getFullYear();
    yearOptions.value = Array.from({ length: 10 }, (_, i) => y - i);
}

// ---- Helpers
const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
const firstDayOfYear = (y: number) => `${y}-01-01`;
const lastDayOfYear = (y: number) => `${y}-12-31`;

async function fetchAllTx(params: { from?: string; to?: string; accountId?: number }) {
    const items: any[] = [];
    let page = 1;
    const pageSize = 100;
    while (true) {
        await tx.load({ ...params, page, pageSize });
        const batch = Array.isArray(tx.items.value) ? tx.items.value : [];
        items.push(...batch);
        if (batch.length < pageSize) break;
        page++;
        if (page > 50) break;
    }
    return items;
}

// ---- Loading + error
const loading = ref(false);
const error = ref<string>("");

// ---- Category tree (id, name, color, children)
type Row = { id: number; name: string; color: string | null; children: { id: number; name: string; parentId: number }[] };

// Normalize text
function normalize(s: string) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Special roots
const savingsCategoryId = computed<number | null>(() => {
    const r = (roots.value || []).find(r => normalize(r.name) === "poupanca");
    return r ? r.id : null;
});

const incomeRootIds = computed<Set<number>>(() => {
    const ids = new Set<number>();
    for (const r of roots.value || []) {
        const n = normalize(r.name);
        if (n === "salarios" || n === "outros recebimentos") ids.add(r.id);
    }
    return ids;
});

// Expense tree (exclude poupança & incomes)
const expenseTree = computed<Row[]>(() => {
    const sid = savingsCategoryId.value;
    const incomeIdsSet = incomeRootIds.value;

    return (roots.value || [])
        .filter(r => r.id !== sid && !incomeIdsSet.has(r.id))
        .map(r => ({
            id: r.id,
            name: r.name,
            color: r.color ?? null,
            children: (r.children || []).map(c => ({ id: c.id, name: c.name, parentId: r.id })),
        }));
});

// Income tree (only the two income roots)
const incomeTree = computed<Row[]>(() => {
    const incomeIdsSet = incomeRootIds.value;
    return (roots.value || [])
        .filter(r => incomeIdsSet.has(r.id))
        .map(r => ({
            id: r.id,
            name: r.name,
            color: r.color ?? null,
            children: (r.children || []).map(c => ({ id: c.id, name: c.name, parentId: r.id })),
        }));
});

// Lookup parent for subcategories (expenses)
const parentOfExpenseSub = computed(() => {
    const map = new Map<number, number>();
    for (const r of expenseTree.value) for (const c of r.children) map.set(c.id, r.id);
    return map;
});

function colorOfCat(catId: number): string {
    const row = expenseTree.value.find(r => r.id === catId) || incomeTree.value.find(r => r.id === catId);
    return row?.color || "#94a3b8";
}

// ---- Aggregations
const sumsByMonthCat = ref<Record<string, Record<number, number>>>({});
const sumsByMonthSub = ref<Record<string, Record<number, number>>>({});
const totalsByCat = ref<Record<number, number>>({});
const totalsBySub = ref<Record<number, number>>({});
const totalsByMonth = ref<Record<string, number>>({});
const grandTotal = ref<number>(0);

const incomeSumsByMonthCat = ref<Record<string, Record<number, number>>>({});
const incomeSumsByMonthSub = ref<Record<string, Record<number, number>>>({});
const incomeTotalsByCat = ref<Record<number, number>>({});
const incomeTotalsBySub = ref<Record<number, number>>({});
const totalsByMonthIncome = ref<Record<string, number>>({});
const incomeYearTotal = ref<number>(0);
const incomeGrandTotal = incomeYearTotal;

const monthsForYear = computed(() =>
    Array.from({ length: 12 }, (_, i) => ({ key: monthKey(year.value, i + 1), label: monthNames[i] }))
);

async function refresh() {
    try {
        loading.value = true;
        error.value = "";

        if (!accountsStore.items.value.length) await loadAccounts();
        if (!roots.value.length) await loadCats();

        const accId = activeId.value || undefined;
        const from = firstDayOfYear(year.value);
        const to = lastDayOfYear(year.value);
        const txs = await fetchAllTx({ accountId: accId, from, to });

        // reset buckets
        sumsByMonthCat.value = {};
        sumsByMonthSub.value = {};
        totalsBySub.value = {};
        totalsByCat.value = {};
        totalsByMonth.value = {};
        grandTotal.value = 0;

        incomeSumsByMonthCat.value = {};
        incomeSumsByMonthSub.value = {};
        incomeTotalsByCat.value = {};
        incomeTotalsBySub.value = {};
        totalsByMonthIncome.value = {};
        incomeYearTotal.value = 0;

        const sid = savingsCategoryId.value;
        const incomeIdsSet = incomeRootIds.value;

        const subToRoot = new Map<number, number>();
        for (const r of roots.value || []) for (const c of r.children || []) subToRoot.set(c.id, r.id);

        const visibleExpenseSubToParent = parentOfExpenseSub.value;

        for (const t of txs) {
            if (typeof t.amount !== "number") continue;
            const d = new Date(t.date);
            const key = monthKey(d.getFullYear(), d.getMonth() + 1);
            const rootId: number | undefined = t.categoryId != null ? subToRoot.get(t.categoryId) : undefined;

            if (t.amount > 0 && rootId != null && incomeIdsSet.has(rootId)) {
                const cents = t.amount;
                if (!incomeSumsByMonthSub.value[key]) incomeSumsByMonthSub.value[key] = {};
                if (t.categoryId != null) {
                    incomeSumsByMonthSub.value[key][t.categoryId] =
                        (incomeSumsByMonthSub.value[key][t.categoryId] || 0) + cents;
                    incomeTotalsBySub.value[t.categoryId] = (incomeTotalsBySub.value[t.categoryId] || 0) + cents;
                }
                if (!incomeSumsByMonthCat.value[key]) incomeSumsByMonthCat.value[key] = {};
                incomeSumsByMonthCat.value[key][rootId] = (incomeSumsByMonthCat.value[key][rootId] || 0) + cents;
                incomeTotalsByCat.value[rootId] = (incomeTotalsByCat.value[rootId] || 0) + cents;
                totalsByMonthIncome.value[key] = (totalsByMonthIncome.value[key] || 0) + cents;
                incomeYearTotal.value += cents;
                continue;
            }

            if (t.amount < 0) {
                const cents = -t.amount;
                const catId = t.categoryId != null ? visibleExpenseSubToParent.get(t.categoryId) : undefined;
                if (catId == null) continue;
                if (sid != null && catId === sid) continue;
                if (!sumsByMonthSub.value[key]) sumsByMonthSub.value[key] = {};
                if (t.categoryId != null) {
                    sumsByMonthSub.value[key][t.categoryId] = (sumsByMonthSub.value[key][t.categoryId] || 0) + cents;
                    totalsBySub.value[t.categoryId] = (totalsBySub.value[t.categoryId] || 0) + cents;
                }
                if (!sumsByMonthCat.value[key]) sumsByMonthCat.value[key] = {};
                sumsByMonthCat.value[key][catId] = (sumsByMonthCat.value[key][catId] || 0) + cents;
                totalsByCat.value[catId] = (totalsByCat.value[catId] || 0) + cents;
                totalsByMonth.value[key] = (totalsByMonth.value[key] || 0) + cents;
                grandTotal.value += cents;
            }
        }
    } catch (e: any) {
        error.value = e?.message ?? "Falha ao carregar dados.";
    } finally {
        loading.value = false;
    }
}

// Mounted
onMounted(async () => {
    await initYearOptions();
    await loadCats(true);
    await refresh();
});

// ---- Percent helpers
function percentOf(valueCents: number, totalCents: number) {
    if (!totalCents) return 0;
    return (valueCents / totalCents) * 100;
}
function percentCat(catId: number) { return percentOf(totalsByCat.value[catId] || 0, grandTotal.value); }
function percentSub(subId: number) { return percentOf(totalsBySub.value[subId] || 0, grandTotal.value); }
function percentIncomeCat(catId: number) { return percentOf(incomeTotalsByCat.value[catId] || 0, incomeGrandTotal.value); }
function percentIncomeSub(subId: number) { return percentOf(incomeTotalsBySub.value[subId] || 0, incomeGrandTotal.value); }

// ---- Accordion state (if you still use them elsewhere)
const expanded = ref<Set<number>>(new Set());
const incomeExpanded = ref<Set<number>>(new Set());
function isExpanded(id: number) { return expanded.value.has(id); }
function toggleCat(id: number) { const s = new Set(expanded.value); s.has(id) ? s.delete(id) : s.add(id); expanded.value = s; }
function isIncomeExpanded(id: number) { return incomeExpanded.value.has(id); }
function toggleIncomeCat(id: number) { const s = new Set(incomeExpanded.value); s.has(id) ? s.delete(id) : s.add(id); incomeExpanded.value = s; }

// ECharts options unchanged…
const pieOption = computed<any>(() => {
    const data = expenseTree.value
        .map(r => ({ name: r.name, catId: r.id, value: (totalsByCat.value[r.id] || 0) / 100, itemStyle: { color: colorOfCat(r.id) } }))
        .filter(d => d.value > 0);

    const totalCents = grandTotal.value || 0;

    function subRowsFor(catId: number) {
        const subs = expenseTree.value.find(r => r.id === catId)?.children ?? [];
        const rows = subs
            .map(s => {
                const cents = totalsBySub.value[s.id] || 0;
                if (!cents) return null;
                const pct = percentOf(cents, totalCents);
                return { name: s.name, cents, pct };
            })
            .filter(Boolean) as { name: string; cents: number; pct: number }[];
        rows.sort((a, b) => b.cents - a.cents);
        return rows;
    }

    return {
        tooltip: {
            trigger: "item",
            confine: true,
            formatter: (p: any) => {
                const item = p.data || {};
                const catId = item.catId as number;
                const catCents = (catId != null ? (totalsByCat.value[catId] || 0) : Math.round(p.value * 100));
                const catPct = percentOf(catCents, totalCents);
                const lines: string[] = [];
                lines.push(`${p.marker} <b>${p.name}</b>`);
                lines.push(`Total: <b>${formatCentsEUR(catCents)}</b> • ${catPct.toFixed(1)}%`);
                const subs = subRowsFor(catId);
                if (subs.length) {
                    lines.push('<div style="margin-top:6px"></div>');
                    for (const s of subs) lines.push(`${s.name}: <b>${formatCentsEUR(s.cents)}</b> • ${s.pct.toFixed(1)}%`);
                } else {
                    lines.push("<i>Sem subcategorias com movimento</i>");
                }
                return lines.join("<br/>");
            },
        },
        series: [{ type: "pie", radius: ["50%", "70%"], avoidLabelOverlap: true, label: { show: true, formatter: (params: any) => `${params.name} (${params.percent}%)` }, data }],
    };
});

const lineOption = computed<any>(() => {
    const xs = monthsForYear.value.map(m => m.label);
    const gastos = monthsForYear.value.map(m => (totalsByMonth.value[m.key] || 0) / 100);
    const receitas = monthsForYear.value.map(m => (totalsByMonthIncome.value[m.key] || 0) / 100);
    return {
        grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
        tooltip: { trigger: "axis" },
        legend: { top: 0 },
        xAxis: { type: "category", data: xs },
        yAxis: { type: "value" },
        series: [
            { name: "Gastos", type: "line", smooth: true, data: gastos },
            { name: "Receitas", type: "line", smooth: true, data: receitas },
        ],
    };
});

// ---- Table helpers (typed to avoid TS 7006)
function monthValueForCat(catId: number, key: string) { return (sumsByMonthCat.value[key]?.[catId] || 0); }
function monthValueForSub(subId: number, key: string) { return (sumsByMonthSub.value[key]?.[subId] || 0); }
function monthIncomeForCat(catId: number, key: string) { return (incomeSumsByMonthCat.value[key]?.[catId] || 0); }
function monthIncomeForSub(subId: number, key: string) { return (incomeSumsByMonthSub.value[key]?.[subId] || 0); }

/* -------------------- CATEGORY FILTER INTEGRATION -------------------- */
type Kind = "expense" | "income";
type SubRow = { id: number; name: string; parentId: number };
type RootRow = { id: number; name: string; color: string | null; type: Kind; children: SubRow[] };

// Roots with explicit kind, excluding Poupança for expense
const allRootsWithType = computed<RootRow[]>(() => {
    const incomeIdsSet = incomeRootIds.value;
    const sid = savingsCategoryId.value;

    const mapped = (roots.value || []).map(r => {
        const t: Kind = incomeIdsSet.has(r.id) ? "income" : "expense";
        return {
            id: r.id,
            name: r.name,
            color: r.color ?? null,
            type: t,
            children: (r.children || []).map(c => ({ id: c.id, name: c.name, parentId: r.id })),
        };
    }) as RootRow[];

    return mapped.filter(r => !(r.type === "expense" && sid != null && r.id === sid));
});

// EXPENSE filter state
const showExpenseFilter = ref(false);
const expenseSelection = ref<{ rootIds: number[]; subIds: number[] } | null>(null);
function openExpenseFilter() { showExpenseFilter.value = true; }
function applyExpenseFilter(payload: { rootIds: number[]; subIds: number[] }) {
    expenseSelection.value = payload;
}

// INCOME filter state
const showIncomeFilter = ref(false);
const incomeSelection = ref<{ rootIds: number[]; subIds: number[] } | null>(null);
function openIncomeFilter() { showIncomeFilter.value = true; }
function applyIncomeFilter(payload: { rootIds: number[]; subIds: number[] }) {
    incomeSelection.value = payload;
}

// Apply selection to trees
const expenseRowsFiltered = computed<Row[]>(() => {
    const base = expenseTree.value;
    const sel = expenseSelection.value;
    if (!sel) return base;

    const rootSet = new Set(sel.rootIds);
    const subSet = new Set(sel.subIds);

    return base
        .map(r => {
            if (rootSet.has(r.id)) return r; // whole root selected
            const kids = (r.children || []).filter(c => subSet.has(c.id));
            return kids.length ? { ...r, children: kids } : null;
        })
        .filter(Boolean) as Row[];
});

const incomeRowsFiltered = computed<Row[]>(() => {
    const base = incomeTree.value;
    const sel = incomeSelection.value;
    if (!sel) return base;

    const rootSet = new Set(sel.rootIds);
    const subSet = new Set(sel.subIds);

    return base
        .map(r => {
            if (rootSet.has(r.id)) return r;
            const kids = (r.children || []).filter(c => subSet.has(c.id));
            return kids.length ? { ...r, children: kids } : null;
        })
        .filter(Boolean) as Row[];
});
</script>

<template>
    <div class="space-y-8 mt-2 md:mt-6">
        <!-- Controls -->
        <section class="flex flex-wrap items-end gap-3">
            <label class="text-sm text-gray-700">
                Ano:
                <select v-model.number="year"
                    class="ml-1 h-9 px-3 rounded border bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/40"
                    @change="refresh">
                    <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
                </select>
            </label>
            <Button variant="primary" size="sm" title="Atualizar" @click="refresh">Atualizar</Button>
            <span v-if="loading" class="text-gray-500 text-sm">A carregar…</span>
            <span v-else-if="error" class="text-red-600 text-sm">{{ error }}</span>
        </section>

        <!-- Charts -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-72">
            <div class="border rounded bg-white p-3">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-medium">Despesas por Categoria ({{ year }})</h3>
                    <Button variant="ghost" size="xs" @click="openExpenseFilter">Filtrar categorias…</Button>
                </div>
                <VChart :option="pieOption" autoresize style="height: 320px" />
            </div>
            <div class="border rounded bg-white p-3">
                <h3 class="font-medium mb-2">Tendência mensal ({{ year }})</h3>
                <VChart :option="lineOption" autoresize style="height: 320px" />
            </div>
        </section>

        <!-- DESPESAS header with filter button -->
        <div class="flex items-center justify-between mt-8 mb-2">
            <h3 class="font-medium">Despesas</h3>
            <Button variant="ghost" size="sm" @click="openExpenseFilter">Filtrar categorias…</Button>
        </div>

        <!-- DESPESAS TABLE -->
        <CategorySummaryTable :config="{
            months: monthsForYear,
            rows: expenseRowsFiltered,
            labels: { title: 'Despesas', percent: 'Gastos %' },
            accessors: {
                format: (cents: number | bigint) => formatCentsEUR(Number(cents)),
                catValue: (catId: number, key: string) => monthValueForCat(catId, key),
                subValue: (subId: number, key: string) => monthValueForSub(subId, key),
                catTotal: (catId: number) => totalsByCat[catId] || 0,
                subTotal: (subId: number) => totalsBySub[subId] || 0,
                catPercent: (catId: number) => percentCat(catId),
                subPercent: (subId: number) => percentSub(subId),
                colorCat: (catId: number) => colorOfCat(catId),
                colorParent: (parentId: number) => colorOfCat(parentId),
            },
            ui: {
                resizable: true,
                storageKey: 'pf_expense_table_widths',
                zebraChildren: true,
                stickyHeader: true,
            }
        }" />

        <!-- RECEITAS header with filter button -->
        <div class="flex items-center justify-between mt-8 mb-2">
            <h3 class="font-medium">Receitas</h3>
            <Button variant="ghost" size="sm" @click="openIncomeFilter">Filtrar categorias…</Button>
        </div>

        <!-- RECEITAS TABLE -->
        <CategorySummaryTable :config="{
            months: monthsForYear,
            rows: incomeRowsFiltered,
            labels: { title: 'Receitas', percent: 'Receitas %' },
            accessors: {
                format: (cents: number | bigint) => formatCentsEUR(Number(cents)),
                catValue: (catId: number, key: string) => monthIncomeForCat(catId, key),
                subValue: (subId: number, key: string) => monthIncomeForSub(subId, key),
                catTotal: (catId: number) => incomeTotalsByCat[catId] || 0,
                subTotal: (subId: number) => incomeTotalsBySub[subId] || 0,
                catPercent: (catId: number) => percentIncomeCat(catId),
                subPercent: (subId: number) => percentIncomeSub(subId),
                colorCat: (catId: number) => colorOfCat(catId),
                colorParent: (parentId: number) => colorOfCat(parentId),
            },
            ui: {
                stickyHeader: true,
                zebraChildren: true,
                resizable: true,
                storageKey: 'pf_income_table_widths',
            }
        }" />

        <!-- MODALS -->
        <CategoryFilterModal v-model:open="showExpenseFilter" kind="expense" :roots="allRootsWithType"
            :selected-root-ids="expenseSelection?.rootIds || undefined"
            :selected-sub-ids="expenseSelection?.subIds || undefined" localStorageKey="pf_filter_expense"
            @apply="applyExpenseFilter" />

        <CategoryFilterModal v-model:open="showIncomeFilter" kind="income" :roots="allRootsWithType"
            :selected-root-ids="incomeSelection?.rootIds || undefined"
            :selected-sub-ids="incomeSelection?.subIds || undefined" localStorageKey="pf_filter_income"
            @apply="applyIncomeFilter" />

        <p class="text-xs text-gray-500">
            * Apenas despesas (valores negativos) entram em "Despesas"; apenas receitas (valores positivos) dos root
            "Salários"
            e "Outros Recebimentos" entram em "Receitas". "Poupança" é excluída.
        </p>
    </div>
</template>

<style scoped>
.grid-row>* {
    padding: 0.5rem;
}

.accordion-enter-active,
.accordion-leave-active {
    overflow: hidden;
}
</style>
