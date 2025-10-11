<script setup lang="ts">
// Yearly-first dashboard (excludes category "Poupança").
// Gastos vs Receitas line chart, sticky header, per-column borders.
// Update: full-row toggles (no button), smaller Subcategoria column, smoother accordion
// animation (height + opacity + translate), year select with available years
// and **separate Despesas and Receitas tables**.

import { ref, computed, onMounted, defineComponent } from "vue";
import VChart from "vue-echarts";
import { useTransactions } from "@/services/transactions/transactions.store";
import { useAccounts } from "@/services/accounts/accounts.store";
import { useCategories } from "@/services/categories/categories.store";
import { formatCentsEUR } from "@/utils/money";
import Button from "@/components/ui/Button.vue";

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
        if (typeof maybeYears === 'function') {
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
const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];
const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
const firstDayOfYear = (y: number) => `${y}-01-01`;
const lastDayOfYear = (y: number) => `${y}-12-31`;

async function fetchAllTx(params: { from?: string; to?: string; accountId?: number }) {
    const items: any[] = [];
    let page = 1;
    const pageSize = 100; // repo clamps max=100
    while (true) {
        await tx.load({ ...params, page, pageSize });
        const batch = Array.isArray(tx.items.value) ? tx.items.value : [];
        items.push(...batch);
        if (batch.length < pageSize) break;
        page++;
        if (page > 50) break; // safety hard-stop
    }
    return items;
}

// ---- Loading + error
const loading = ref(false);
const error = ref<string>("");

// ---- Category tree (id, name, color, children)
type Row = { id: number; name: string; color: string | null; children: { id: number; name: string; parentId: number }[] };

// Normalize text to compare names robustly
function normalize(s: string) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Find special root categories
const savingsCategoryId = computed<number | null>(() => {
    const r = (roots.value || []).find(r => normalize(r.name) === 'poupanca');
    return r ? r.id : null;
});
const incomeRootIds = computed<Set<number>>(() => {
    const ids = new Set<number>();
    for (const r of roots.value || []) {
        const n = normalize(r.name);
        if (n === 'salarios' || n === 'outros recebimentos') ids.add(r.id);
    }
    return ids;
});

// Visible expense category tree: excludes Poupança and income roots
const expenseTree = computed<Row[]>(() => {
    const sid = savingsCategoryId.value;
    const incomeIds = incomeRootIds.value;
    return (roots.value || [])
        .filter(r => r.id !== sid && !incomeIds.has(r.id))
        .map(r => ({
            id: r.id,
            name: r.name,
            color: r.color ?? null,
            children: (r.children || []).map(c => ({ id: c.id, name: c.name, parentId: r.id }))
        }));
});

// Income category tree (only the two income roots)
const incomeTree = computed<Row[]>(() => {
    const incomeIds = incomeRootIds.value;
    return (roots.value || [])
        .filter(r => incomeIds.has(r.id))
        .map(r => ({
            id: r.id,
            name: r.name,
            color: r.color ?? null,
            children: (r.children || []).map(c => ({ id: c.id, name: c.name, parentId: r.id }))
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
    return row?.color || '#94a3b8';
}

// ---- Aggregations
// Expenses only (negatives -> positive cents), excluding Poupança
const sumsByMonthCat = ref<Record<string, Record<number, number>>>({}); // YYYY-MM -> { catId: cents }
const sumsByMonthSub = ref<Record<string, Record<number, number>>>({}); // YYYY-MM -> { subId: cents }
const totalsByCat = ref<Record<number, number>>({}); // catId -> cents (year)
const totalsBySub = ref<Record<number, number>>({}); // subId -> cents (year)
const totalsByMonth = ref<Record<string, number>>({}); // YYYY-MM -> cents (expenses)
const grandTotal = ref<number>(0); // total expenses in the year

// Income (positive amounts) only from the two income roots
const incomeSumsByMonthCat = ref<Record<string, Record<number, number>>>({}); // YYYY-MM -> { incomeRootId: cents }
const incomeSumsByMonthSub = ref<Record<string, Record<number, number>>>({}); // YYYY-MM -> { subId: cents }
const incomeTotalsByCat = ref<Record<number, number>>({}); // incomeRootId -> cents
const incomeTotalsBySub = ref<Record<number, number>>({}); // subId -> cents
const totalsByMonthIncome = ref<Record<string, number>>({}); // YYYY-MM -> cents (income)
const incomeYearTotal = ref<number>(0);
const incomeGrandTotal = incomeYearTotal; // alias for clarity

const monthsForYear = computed(() => Array.from({ length: 12 }, (_, i) => ({
    key: monthKey(year.value, i + 1),
    label: monthNames[i],
})));

async function refresh() {
    try {
        loading.value = true;
        error.value = "";

        // ensure dependencies
        if (!accountsStore.items.value.length) await loadAccounts();
        if (!roots.value.length) await loadCats();

        const accId = activeId.value || undefined;
        const from = firstDayOfYear(year.value);
        const to = lastDayOfYear(year.value);
        const txs = await fetchAllTx({ accountId: accId, from, to });

        // reset buckets (expenses)
        sumsByMonthCat.value = {};
        sumsByMonthSub.value = {};
        totalsBySub.value = {};
        totalsByCat.value = {};
        totalsByMonth.value = {};
        grandTotal.value = 0;

        // reset buckets (income)
        incomeSumsByMonthCat.value = {};
        incomeSumsByMonthSub.value = {};
        incomeTotalsByCat.value = {};
        incomeTotalsBySub.value = {};
        totalsByMonthIncome.value = {};
        incomeYearTotal.value = 0;

        const sid = savingsCategoryId.value;
        const incomeIds = incomeRootIds.value;

        // Build parent lookup for ALL subs from ALL roots for classification
        const subToRoot = new Map<number, number>();
        for (const r of (roots.value || [])) for (const c of (r.children || [])) subToRoot.set(c.id, r.id);

        // Expense visible mapping
        const visibleExpenseSubToParent = parentOfExpenseSub.value;

        for (const t of txs) {
            if (typeof t.amount !== 'number') continue;
            const d = new Date(t.date);
            const key = monthKey(d.getFullYear(), d.getMonth() + 1);
            const rootId: number | undefined = t.categoryId != null ? subToRoot.get(t.categoryId) : undefined;

            if (t.amount > 0 && rootId != null && incomeIds.has(rootId)) {
                const cents = t.amount; // already positive cents
                // per-sub
                if (!incomeSumsByMonthSub.value[key]) incomeSumsByMonthSub.value[key] = {};
                if (t.categoryId != null) {
                    incomeSumsByMonthSub.value[key][t.categoryId] = (incomeSumsByMonthSub.value[key][t.categoryId] || 0) + cents;
                    incomeTotalsBySub.value[t.categoryId] = (incomeTotalsBySub.value[t.categoryId] || 0) + cents;
                }
                // per-root (cat)
                if (!incomeSumsByMonthCat.value[key]) incomeSumsByMonthCat.value[key] = {};
                incomeSumsByMonthCat.value[key][rootId] = (incomeSumsByMonthCat.value[key][rootId] || 0) + cents;
                incomeTotalsByCat.value[rootId] = (incomeTotalsByCat.value[rootId] || 0) + cents;
                // totals
                totalsByMonthIncome.value[key] = (totalsByMonthIncome.value[key] || 0) + cents;
                incomeYearTotal.value += cents;
                continue;
            }

            if (t.amount < 0) {
                const cents = -t.amount; // make positive
                const catId = t.categoryId != null ? visibleExpenseSubToParent.get(t.categoryId) : undefined;
                if (catId == null) continue;
                if (sid != null && catId === sid) continue; // guard
                // per-sub
                if (!sumsByMonthSub.value[key]) sumsByMonthSub.value[key] = {};
                if (t.categoryId != null) {
                    sumsByMonthSub.value[key][t.categoryId] = (sumsByMonthSub.value[key][t.categoryId] || 0) + cents;
                    totalsBySub.value[t.categoryId] = (totalsBySub.value[t.categoryId] || 0) + cents;
                }
                // per-cat
                if (!sumsByMonthCat.value[key]) sumsByMonthCat.value[key] = {};
                sumsByMonthCat.value[key][catId] = (sumsByMonthCat.value[key][catId] || 0) + cents;
                totalsByCat.value[catId] = (totalsByCat.value[catId] || 0) + cents;
                // totals
                totalsByMonth.value[key] = (totalsByMonth.value[key] || 0) + cents;
                grandTotal.value += cents;
            }
        }
    } catch (e: any) {
        error.value = e?.message ?? 'Falha ao carregar dados.';
    } finally {
        loading.value = false;
    }
}

// Mounted: initialize year options then load data
onMounted(async () => {
    await initYearOptions();
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

// ---- Accordion state (collapsed by default)
const expanded = ref<Set<number>>(new Set()); // expenses
const incomeExpanded = ref<Set<number>>(new Set()); // income
function isExpanded(id: number) { return expanded.value.has(id); }
function toggleCat(id: number) { const s = new Set(expanded.value); s.has(id) ? s.delete(id) : s.add(id); expanded.value = s; }
function isIncomeExpanded(id: number) { return incomeExpanded.value.has(id); }
function toggleIncomeCat(id: number) { const s = new Set(incomeExpanded.value); s.has(id) ? s.delete(id) : s.add(id); incomeExpanded.value = s; }

// Smooth accordion transitions with height + opacity + translate
function onEnter(el: Element) {
    const e = el as HTMLElement;
    e.style.height = '0px';
    e.style.opacity = '0';
    e.style.transform = 'translateY(-4px)';
    requestAnimationFrame(() => {
        e.style.transition = 'height .25s ease, opacity .25s ease, transform .25s ease';
        e.style.height = e.scrollHeight + 'px';
        e.style.opacity = '1';
        e.style.transform = 'translateY(0)';
    });
}
function onAfterEnter(el: Element) {
    const e = el as HTMLElement;
    e.style.transition = '';
    e.style.height = '';
}
function onLeave(el: Element) {
    const e = el as HTMLElement;
    e.style.height = e.scrollHeight + 'px';
    e.style.opacity = '1';
    e.style.transform = 'translateY(0)';
    // force reflow
    void (e as any).offsetHeight;
    e.style.transition = 'height .2s ease, opacity .2s ease, transform .2s ease';
    e.style.height = '0px';
    e.style.opacity = '0';
    e.style.transform = 'translateY(-4px)';
}

// ---- ECharts options
// Pie: Despesas por Categoria (expenses, year)
const pieOption = computed<any>(() => {
    // Build pie slices from category totals (expenses only)
    const data = expenseTree.value
        .map(r => ({
            name: r.name,
            catId: r.id,
            value: (totalsByCat.value[r.id] || 0) / 100, // euros for chart value
            itemStyle: { color: colorOfCat(r.id) },
        }))
        .filter(d => d.value > 0);

    const totalCents = grandTotal.value || 0;

    // Helper: subcategories for tooltip
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
            trigger: 'item',
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
                    for (const s of subs) {
                        lines.push(`${s.name}: <b>${formatCentsEUR(s.cents)}</b> • ${s.pct.toFixed(1)}%`);
                    }
                } else {
                    lines.push('<i>Sem subcategorias com movimento</i>');
                }
                return lines.join('<br/>');
            },
        },
        series: [{
            type: 'pie',
            radius: ['50%', '70%'],
            avoidLabelOverlap: true,
            label: {
                show: true,
                formatter: (params: any) => `${params.name} (${params.percent}%)`,
            },
            data,
        }],
    };
});

// Line: monthly totals (two datasets: Gastos vs Receitas)
const lineOption = computed<any>(() => {
    const xs = monthsForYear.value.map(m => m.label);
    const gastos = monthsForYear.value.map(m => (totalsByMonth.value[m.key] || 0) / 100);
    const receitas = monthsForYear.value.map(m => (totalsByMonthIncome.value[m.key] || 0) / 100);
    return {
        grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
        tooltip: { trigger: 'axis' },
        legend: { top: 0 },
        xAxis: { type: 'category', data: xs },
        yAxis: { type: 'value' },
        series: [
            { name: 'Gastos', type: 'line', smooth: true, data: gastos },
            { name: 'Receitas', type: 'line', smooth: true, data: receitas },
        ],
    };
});

// ---- Table helpers
function monthValueForCat(catId: number, key: string) { return (sumsByMonthCat.value[key]?.[catId] || 0); }
function monthValueForSub(subId: number, key: string) { return (sumsByMonthSub.value[key]?.[subId] || 0); }
function monthIncomeForCat(catId: number, key: string) { return (incomeSumsByMonthCat.value[key]?.[catId] || 0); }
function monthIncomeForSub(subId: number, key: string) { return (incomeSumsByMonthSub.value[key]?.[subId] || 0); }

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
                <h3 class="font-medium mb-2">Despesas por Categoria ({{ year }})</h3>
                <VChart :option="pieOption" autoresize style="height: 320px" />
            </div>
            <div class="border rounded bg-white p-3">
                <h3 class="font-medium mb-2">Tendência mensal ({{ year }})</h3>
                <VChart :option="lineOption" autoresize style="height: 320px" />
            </div>
        </section>

        <!-- DESPESAS TABLE -->
        <section class="border rounded bg-white overflow-x-auto p-0">
            <div class="px-3 pt-3">
                <h3 class="font-medium">Despesas</h3>
            </div>
            <div class="min-w-fit">
                <!-- header -->
                <div
                    class="grid grid-row grid-cols-[14rem_12rem_repeat(12,5rem)_10rem_12rem] gap-0 bg-gray-50 text-sm sticky top-0 z-10 border-b font-bold divide-x divide-gray-200">
                    <div>Categoria</div>
                    <div>Subcategoria</div>
                    <div v-for="m in monthsForYear" :key="m.key" class="text-right">{{ m.label }}</div>
                    <div class="text-right">Total</div>
                    <div class="text-right">Gastos %</div>
                </div>

                <!-- category blocks -->
                <div v-for="cat in expenseTree" :key="cat.id" class="border-b">
                    <!-- category row (full-row toggle) -->
                    <div class="grid grid-row grid-cols-[14rem_12rem_repeat(12,5rem)_10rem_12rem] gap-0 bg-gray-50/60 text-sm divide-x divide-gray-200 hover:bg-gray-100 cursor-pointer select-none"
                        @click="toggleCat(cat.id)" @keydown.enter.prevent="toggleCat(cat.id)"
                        @keydown.space.prevent="toggleCat(cat.id)" role="button" :aria-expanded="isExpanded(cat.id)"
                        tabindex="0">
                        <div class="font-medium flex items-center gap-2">
                            <span class="inline-block transition-transform duration-150 mr-1"
                                :class="isExpanded(cat.id) ? 'rotate-90' : ''">▶</span>
                            <span v-if="cat.color" class="inline-block w-3 h-3 rounded-full"
                                :style="{ background: cat.color! }"></span>
                            <span>{{ cat.name }}</span>
                        </div>
                        <div class="text-gray-400">—</div>

                        <template v-for="m in monthsForYear" :key="m.key">
                            <div class="text-right text-gray-700">{{ formatCentsEUR(monthValueForCat(cat.id, m.key)) }}
                            </div>
                        </template>

                        <div class="text-right font-medium">{{ formatCentsEUR((totalsByCat[cat.id] || 0)) }}</div>

                        <!-- Gastos %: numeric + bar -->
                        <div class="flex items-center gap-2">
                            <div class="w-full h-2 rounded bg-gray-200 overflow-hidden">
                                <div class="h-2"
                                    :style="{ width: percentCat(cat.id).toFixed(2) + '%', background: colorOfCat(cat.id) }">
                                </div>
                            </div>
                            <div class="w-14 text-right tabular-nums">{{ percentCat(cat.id).toFixed(1) }}%</div>
                        </div>
                    </div>

                    <!-- sub rows (accordion content) -->
                    <transition name="accordion" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
                        <div v-if="isExpanded(cat.id)">
                            <div v-for="(sub, i) in cat.children" :key="sub.id"
                                class="grid grid-row grid-cols-[14rem_12rem_repeat(12,5rem)_10rem_12rem] gap-0 text-sm divide-x divide-gray-200"
                                :class="i % 2 ? 'bg-primary/10' : ''">
                                <div></div>
                                <div class="truncate">{{ sub.name }}</div>

                                <template v-for="m in monthsForYear" :key="m.key">
                                    <div class="text-right text-gray-700">{{ formatCentsEUR(monthValueForSub(sub.id,
                                        m.key)) }}</div>
                                </template>

                                <div class="text-right font-medium">{{ formatCentsEUR((totalsBySub[sub.id] || 0)) }}
                                </div>

                                <!-- Gastos % for sub: numeric + bar -->
                                <div class="flex items-center gap-2">
                                    <div class="w-full h-2 rounded bg-gray-200 overflow-hidden">
                                        <div class="h-2"
                                            :style="{ width: percentSub(sub.id).toFixed(2) + '%', background: colorOfCat(sub.parentId) }">
                                        </div>
                                    </div>
                                    <div class="w-14 text-right tabular-nums">{{ percentSub(sub.id).toFixed(1) }}%</div>
                                </div>
                            </div>
                        </div>
                    </transition>
                </div>
            </div>
        </section>

        <!-- RECEITAS TABLE (separate) -->
        <section class="border rounded bg-white overflow-x-auto p-0">
            <div class="px-3 pt-3">
                <h3 class="font-medium">Receitas</h3>
            </div>
            <div class="min-w-fit">
                <!-- header -->
                <div
                    class="grid grid-row grid-cols-[14rem_12rem_repeat(12,5rem)_10rem_12rem] gap-0 bg-gray-50 text-sm sticky top-0 z-10 border-b font-bold divide-x divide-gray-200">
                    <div>Categoria</div>
                    <div>Subcategoria</div>
                    <div v-for="m in monthsForYear" :key="m.key" class="text-right">{{ m.label }}</div>
                    <div class="text-right">Total</div>
                    <div class="text-right">Receitas %</div>
                </div>

                <!-- income category blocks -->
                <div v-for="icat in incomeTree" :key="icat.id" class="border-b">
                    <div class="grid grid-row grid-cols-[14rem_12rem_repeat(12,5rem)_10rem_12rem] gap-0 bg-gray-50/60 text-sm divide-x divide-gray-200 hover:bg-gray-100 cursor-pointer select-none"
                        @click="toggleIncomeCat(icat.id)" @keydown.enter.prevent="toggleIncomeCat(icat.id)"
                        @keydown.space.prevent="toggleIncomeCat(icat.id)" role="button"
                        :aria-expanded="isIncomeExpanded(icat.id)" tabindex="0">
                        <div class="font-medium flex items-center gap-2">
                            <span class="inline-block transition-transform duration-150 mr-1"
                                :class="isIncomeExpanded(icat.id) ? 'rotate-90' : ''">▶</span>
                            <span v-if="icat.color" class="inline-block w-3 h-3 rounded-full"
                                :style="{ background: icat.color! }"></span>
                            <span>{{ icat.name }}</span>
                        </div>
                        <div class="text-gray-400">—</div>

                        <template v-for="m in monthsForYear" :key="m.key">
                            <div class="text-right text-gray-700">{{ formatCentsEUR(monthIncomeForCat(icat.id, m.key))
                            }}</div>
                        </template>

                        <div class="text-right font-medium">{{ formatCentsEUR((incomeTotalsByCat[icat.id] || 0)) }}
                        </div>

                        <!-- Receitas %: numeric + bar -->
                        <div class="flex items-center gap-2">
                            <div class="w-full h-2 rounded bg-gray-200 overflow-hidden">
                                <div class="h-2"
                                    :style="{ width: percentIncomeCat(icat.id).toFixed(2) + '%', background: colorOfCat(icat.id) }">
                                </div>
                            </div>
                            <div class="w-14 text-right tabular-nums">{{ percentIncomeCat(icat.id).toFixed(1) }}%</div>
                        </div>
                    </div>

                    <transition name="accordion" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
                        <div v-if="isIncomeExpanded(icat.id)">
                            <div v-for="(sub, i) in icat.children" :key="sub.id"
                                class="grid grid-row grid-cols-[14rem_12rem_repeat(12,5rem)_10rem_12rem] gap-0 text-sm divide-x divide-gray-200"
                                :class="i % 2 ? 'bg-primary/10' : ''">
                                <div></div>
                                <div class="truncate">{{ sub.name }}</div>

                                <template v-for="m in monthsForYear" :key="m.key">
                                    <div class="text-right text-gray-700">{{ formatCentsEUR(monthIncomeForSub(sub.id,
                                        m.key)) }}</div>
                                </template>

                                <div class="text-right font-medium">{{ formatCentsEUR((incomeTotalsBySub[sub.id] || 0))
                                }}</div>

                                <!-- Receitas % for sub -->
                                <div class="flex items-center gap-2">
                                    <div class="w-full h-2 rounded bg-gray-200 overflow-hidden">
                                        <div class="h-2"
                                            :style="{ width: percentIncomeSub(sub.id).toFixed(2) + '%', background: colorOfCat(sub.parentId) }">
                                        </div>
                                    </div>
                                    <div class="w-14 text-right tabular-nums">{{ percentIncomeSub(sub.id).toFixed(1) }}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </transition>
                </div>
            </div>
        </section>

        <p class="text-xs text-gray-500">* Apenas despesas (valores negativos) entram em "Despesas"; apenas receitas
            (valores
            positivos) dos root "Salários" e "Outros Recebimentos" entram em "Receitas". "Poupança" é excluída.</p>
    </div>
</template>

<style scoped>
/* per-cell padding for all grid rows */
.grid-row>* {
    padding: 0.5rem;
}

/* Transition (JS hooks control height/opacity/translate) */
.accordion-enter-active,
.accordion-leave-active {
    overflow: hidden;
}
</style>