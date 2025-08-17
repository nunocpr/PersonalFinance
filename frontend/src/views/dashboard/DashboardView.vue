<script setup lang="ts">
defineOptions({ name: "DashboardView" });

import { ref, computed, onMounted } from "vue";
import VChart from "vue-echarts";
import { useTransactions } from "@/services/transactions/transactions.store";
import { useAccounts } from "@/services/accounts/accounts.store";
import { useCategories } from "@/services/categories/categories.store";
import { formatCentsEUR } from "@/utils/money";

// stores
const tx = useTransactions();
const accountsStore = useAccounts();
const catStore = useCategories();

const { load: loadAccounts, activeId } = accountsStore;
const { load: loadCats, roots } = catStore;

// UI: month/year picker
type Mode = "month" | "year";
const mode = ref<Mode>("month");

// default to *current* month/year
const today = new Date();
const year = ref<number>(today.getFullYear());
const month = ref<number>(today.getMonth() + 1); // 1..12

// months helpers
const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

// fetch all pages helper (client-side pagination)
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

// period boundaries
function firstDayOfMonth(y: number, m: number) {
    return `${y}-${String(m).padStart(2, "0")}-01`;
}
function lastDayOfMonth(y: number, m: number) {
    const d = new Date(Date.UTC(y, m, 0)); // day 0 of next month => last of current
    return `${y}-${String(m).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function firstDayOfYear(y: number) { return `${y}-01-01`; }
function lastDayOfYear(y: number) { return `${y}-12-31`; }

// load + aggregate state
const loading = ref(false);
const error = ref<string>("");

type Row = { id: number; name: string; color: string | null; children: { id: number; name: string }[] };
const tree = computed<Row[]>(() =>
    (roots.value || []).map(r => ({
        id: r.id,
        name: r.name,
        color: r.color ?? null,
        children: (r.children || []).map(c => ({ id: c.id, name: c.name }))
    }))
);

// aggregations (expenses only; negative amounts become positive cents)
const sumsByMonthCat = ref<Record<string, Record<number, number>>>({});
const sumsByMonthSub = ref<Record<string, Record<number, number>>>({});
const totalsBySub = ref<Record<number, number>>({});
const totalsByCat = ref<Record<number, number>>({});
const grandTotal = ref<number>(0);

// trigger load + aggregate for current controls
async function refresh() {
    try {
        loading.value = true;
        error.value = "";

        // ensure dependencies
        if (!accountsStore.items.value.length) await loadAccounts();
        if (!roots.value.length) await loadCats();

        const accId = activeId.value || undefined;
        let from = "", to = "";
        if (mode.value === "month") {
            from = firstDayOfMonth(year.value, month.value);
            to = lastDayOfMonth(year.value, month.value);
        } else {
            from = firstDayOfYear(year.value);
            to = lastDayOfYear(year.value);
        }

        const txs = await fetchAllTx({ accountId: accId, from, to });

        // reset buckets
        sumsByMonthCat.value = {};
        sumsByMonthSub.value = {};
        totalsBySub.value = {};
        totalsByCat.value = {};
        grandTotal.value = 0;

        // Build lookup: subId -> parent catId
        const parentOfSub = new Map<number, number>();
        for (const r of roots.value) for (const c of (r.children || [])) parentOfSub.set(c.id, r.id);

        // aggregate
        for (const t of txs) {
            // We only count expenses (< 0) as positive spend
            if (typeof t.amount !== "number" || t.amount >= 0) continue;
            const cents = -t.amount;

            const d = new Date(t.date);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const key = monthKey(y, m);

            // sub
            if (!sumsByMonthSub.value[key]) sumsByMonthSub.value[key] = {};
            if (t.categoryId != null) {
                sumsByMonthSub.value[key][t.categoryId] = (sumsByMonthSub.value[key][t.categoryId] || 0) + cents;
                totalsBySub.value[t.categoryId] = (totalsBySub.value[t.categoryId] || 0) + cents;
            }

            // cat (via parent from sub)
            const catId = t.categoryId != null ? parentOfSub.get(t.categoryId) : undefined;
            if (catId != null) {
                if (!sumsByMonthCat.value[key]) sumsByMonthCat.value[key] = {};
                sumsByMonthCat.value[key][catId] = (sumsByMonthCat.value[key][catId] || 0) + cents;
                totalsByCat.value[catId] = (totalsByCat.value[catId] || 0) + cents;
            }

            grandTotal.value += cents;
        }
    } catch (e: any) {
        error.value = e?.message ?? "Falha ao carregar dados.";
    } finally {
        loading.value = false;
    }
}

onMounted(refresh);

// formatted month labels for selected context
const monthsForYear = computed(() => Array.from({ length: 12 }, (_, i) => ({
    key: monthKey(year.value, i + 1),
    label: monthNames[i],
})));

// --------------- CHART OPTIONS ---------------

// palette: use category color or fallback
function colorOfCat(catId: number): string {
    const row = tree.value.find(r => r.id === catId);
    return row?.color || "#94a3b8"; // slate-400 fallback
}

// Bar (expenses by category for the selected period)
const barOption = computed(() => {
    // bucket depending on mode
    const bucket: Record<number, number> = {};
    if (mode.value === "month") {
        const key = monthKey(year.value, month.value);
        const byCat = sumsByMonthCat.value[key] || {};
        for (const [idStr, cents] of Object.entries(byCat)) bucket[+idStr] = cents;
    } else {
        for (const [catIdStr, cents] of Object.entries(totalsByCat.value)) bucket[+catIdStr] = cents;
    }

    const cats = Object.keys(bucket).map(Number);
    const names = cats.map(id => tree.value.find(r => r.id === id)?.name || `#${id}`);
    const data = cats.map(id => (bucket[id] / 100)); // euros
    const colors = cats.map(colorOfCat);

    return {
        grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
        tooltip: {
            trigger: "axis",
            formatter: (params: any[]) =>
                params.map(p => `${p.marker} ${p.name}: <b>${formatCentsEUR(Math.round(p.value * 100))}</b>`).join("<br/>")
        },
        xAxis: { type: "category", data: names },
        yAxis: { type: "value" },
        series: [{
            type: "bar",
            data,
            itemStyle: {
                color: (p: any) => colors[p.dataIndex] || "#94a3b8"
            },
            emphasis: { focus: "series" },
        }]
    };
});

// Line (monthly spend trend for selected year)
const lineOption = computed(() => {
    const xs = monthsForYear.value.map(m => m.label);
    const ys = monthsForYear.value.map(m => {
        const byCat = sumsByMonthCat.value[m.key] || {};
        const sum = Object.values(byCat).reduce((a, b) => a + b, 0);
        return sum / 100;
    });

    return {
        grid: { left: 16, right: 16, top: 24, bottom: 24, containLabel: true },
        tooltip: {
            trigger: "axis",
            formatter: (ps: any[]) => {
                const p = ps[0];
                return `${p.axisValue}<br/>Total: <b>${formatCentsEUR(Math.round(p.value * 100))}</b>`;
            }
        },
        xAxis: { type: "category", data: xs },
        yAxis: { type: "value" },
        series: [{ type: "line", smooth: true, data: ys }]
    };
});

// Donut (share by category for period)
const donutOption = computed(() => {
    const bucket: Record<number, number> = {};
    if (mode.value === "month") {
        const byCat = sumsByMonthCat.value[monthKey(year.value, month.value)] || {};
        for (const [k, v] of Object.entries(byCat)) bucket[+k] = v;
    } else {
        for (const [k, v] of Object.entries(totalsByCat.value)) bucket[+k] = v;
    }

    const data = Object.entries(bucket).map(([idStr, cents]) => {
        const id = +idStr;
        const row = tree.value.find(r => r.id === id);
        return { value: cents / 100, name: row?.name || `#${id}`, itemStyle: { color: colorOfCat(id) } };
    });

    return {
        tooltip: {
            trigger: "item",
            formatter: (p: any) => `${p.marker} ${p.name}: <b>${formatCentsEUR(Math.round(p.value * 100))}</b> (${p.percent}%)`
        },
        series: [{
            type: "pie",
            radius: ["50%", "70%"],
            avoidLabelOverlap: true,
            label: { show: false },
            data
        }]
    };
});

// --------------- TABLE (YEAR) ---------------
const hoveredCatId = ref<number | null>(null);

function catRGBA(color: string | null, alpha = 0.15) {
    // naive hex -> rgba fallback
    if (!color || !/^#?[0-9a-f]{6}$/i.test(color)) return `rgba(148,163,184,${alpha})`; // slate-400
    const hex = color.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function totalForSub(subId: number) {
    return totalsBySub.value[subId] || 0;
}
function percentOf(subId: number) {
    const tot = totalForSub(subId);
    if (!grandTotal.value) return 0;
    return (tot / grandTotal.value) * 100;
}
function monthValueForSub(subId: number, key: string) {
    return (sumsByMonthSub.value[key]?.[subId] || 0);
}
</script>

<template>
    <div class="space-y-8">
        <!-- Controls -->
        <section class="flex flex-wrap items-end gap-3">
            <label class="text-sm text-gray-700">
                Vista:
                <select v-model="mode" class="border rounded px-2 py-1 ml-1">
                    <option value="month">Mês</option>
                    <option value="year">Ano</option>
                </select>
            </label>

            <label v-if="mode === 'year'" class="text-sm text-gray-700">
                Ano:
                <input type="number" v-model.number="year" class="border rounded px-2 py-1 ml-1 w-24"
                    @change="refresh" />
            </label>

            <template v-else>
                <label class="text-sm text-gray-700">
                    Ano:
                    <input type="number" v-model.number="year" class="border rounded px-2 py-1 ml-1 w-24"
                        @change="refresh" />
                </label>
                <label class="text-sm text-gray-700">
                    Mês:
                    <select v-model.number="month" class="border rounded px-2 py-1 ml-1" @change="refresh">
                        <option v-for="(m, idx) in monthNames" :key="idx" :value="idx + 1">{{ m }}</option>
                    </select>
                </label>
            </template>

            <button class="px-3 py-1.5 rounded bg-black text-white" @click="refresh">Atualizar</button>
        </section>

        <!-- Loading / error -->
        <p v-if="loading" class="text-gray-600">A carregar…</p>
        <p v-else-if="error" class="text-red-600">{{ error }}</p>

        <!-- Charts -->
        <section v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="border rounded bg-white p-3">
                <h3 class="font-medium mb-2">Despesas por categoria ({{ mode === 'month' ? 'mês' : 'ano' }})</h3>
                <VChart :option="barOption" autoresize style="height: 280px" />
            </div>
            <div class="border rounded bg-white p-3">
                <h3 class="font-medium mb-2">Distribuição</h3>
                <VChart :option="donutOption" autoresize style="height: 280px" />
            </div>
            <div class="border rounded bg-white p-3">
                <h3 class="font-medium mb-2">Tendência mensal ({{ year }})</h3>
                <VChart :option="lineOption" autoresize style="height: 280px" />
            </div>
        </section>

        <!-- Year table -->
        <section class="border rounded bg-white overflow-x-auto p-3">
            <h3 class="font-medium mb-3">Tabela anual por categoria / subcategoria ({{ year }})</h3>

            <div class="min-w-[960px]">
                <!-- header -->
                <div
                    class="grid grid-cols-[16rem_16rem_repeat(12,6rem)_12rem] gap-2 px-2 py-2 bg-gray-50 text-sm font-medium">
                    <div>Categoria</div>
                    <div>Subcategoria</div>
                    <div v-for="m in monthsForYear" :key="m.key" class="text-right">{{ m.label }}</div>
                    <div class="text-right">Total</div>
                </div>

                <!-- rows -->
                <div v-for="cat in tree" :key="cat.id" class="border-t first:border-t-0">
                    <!-- category row -->
                    <div class="grid grid-cols-[16rem_16rem_repeat(12,6rem)_12rem] gap-2 px-2 py-1.5 bg-gray-50/50 text-sm"
                        @mouseenter="hoveredCatId = cat.id" @mouseleave="hoveredCatId = null">
                        <div class="font-medium flex items-center gap-2">
                            <span v-if="cat.color" class="inline-block w-3 h-3 rounded-full"
                                :style="{ background: cat.color! }"></span>
                            <span>{{ cat.name }}</span>
                        </div>
                        <div class="text-gray-400">—</div>
                        <template v-for="m in monthsForYear" :key="m.key">
                            <div class="text-right text-gray-500">
                                {{ formatCentsEUR((sumsByMonthCat[m.key]?.[cat.id] || 0)) }}
                            </div>
                        </template>
                        <div class="text-right font-medium">
                            {{ formatCentsEUR((totalsByCat[cat.id] || 0)) }}
                        </div>
                    </div>

                    <!-- sub rows -->
                    <div v-for="sub in cat.children" :key="sub.id"
                        class="grid grid-cols-[16rem_16rem_repeat(12,6rem)_12rem] gap-2 px-2 py-1.5 text-sm">
                        <div></div>
                        <div class="truncate">{{ sub.name }}</div>

                        <template v-for="m in monthsForYear" :key="m.key">
                            <div class="text-right text-gray-700">
                                {{ formatCentsEUR(monthValueForSub(sub.id, m.key)) }}
                            </div>
                        </template>

                        <!-- total cell w/ hover highlight + % -->
                        <div class="text-right"
                            :style="hoveredCatId === cat.id ? { background: catRGBA(cat.color, .18), borderRadius: '6px', paddingRight: '6px' } : {}">
                            <template v-if="hoveredCatId === cat.id">
                                <span class="font-medium">{{ formatCentsEUR(totalForSub(sub.id))
                                }}</span>
                                <span class="text-gray-500"> ({{ percentOf(sub.id).toFixed(1) }}%)</span>
                            </template>
                            <template v-else>
                                {{ formatCentsEUR(totalForSub(sub.id)) }}
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <p class="text-xs text-gray-500">
            * Apenas despesas (valores negativos) são contabilizadas.
        </p>
    </div>
</template>
