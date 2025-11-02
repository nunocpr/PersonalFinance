<script setup lang="ts">


import { computed, onBeforeUnmount, ref } from "vue";

/** External types the page passes in */
type Month = { key: string; label: string };
type SubRow = { id: number; name: string; parentId: number };
type Row = { id: number; name: string; color: string | null; children: SubRow[] };

type Accessors = {
    format: (cents: number | bigint) => string;
    catValue: (catId: number, monthKey: string) => number;
    subValue: (subId: number, monthKey: string) => number;
    catTotal: (catId: number) => number;
    subTotal: (subId: number) => number;
    catPercent: (catId: number) => number;  // 0..100
    subPercent: (subId: number) => number;  // 0..100
    colorCat: (catId: number) => string;    // CSS color
    colorParent: (parentId: number) => string;
};

type Labels = {
    title: string;                 // not rendered (kept for API symmetry)
    category?: string;
    subcategory?: string;
    total?: string;
    percent?: string;
};

type UI = {
    stickyHeader?: boolean;
    zebraChildren?: boolean;
    /** enable column resizing & persist to localStorage key */
    resizable?: boolean;
    storageKey?: string;
    widths?: {
        category?: number;     // px
        subcategory?: number;  // px
        month?: number;        // default month width (px)
        total?: number;        // px
        percent?: number;      // px
    };
    /** summary/footer row (bottom line) */
    summaryRow?: {
        show?: boolean;        // default true
    };
};

const props = defineProps<{
    config: {
        months: Month[];
        rows: Row[];
        labels: Labels;
        accessors: Accessors;
        ui?: UI;
    };
}>();

/* ---------- labels & ui defaults ---------- */
const labels = computed(() => ({
    // title intentionally not rendered
    title: props.config.labels.title,
    category: props.config.labels.category ?? "Categoria",
    subcategory: props.config.labels.subcategory ?? "Subcategoria",
    total: props.config.labels.total ?? "Total",
    percent: props.config.labels.percent ?? "%",
}));

const ui = computed<Required<Pick<UI, "stickyHeader" | "zebraChildren" | "resizable" | "storageKey" | "widths" | "summaryRow">>>(() => ({
    stickyHeader: props.config.ui?.stickyHeader ?? true,
    zebraChildren: props.config.ui?.zebraChildren ?? true,
    resizable: props.config.ui?.resizable ?? false,
    storageKey: props.config.ui?.storageKey ?? "",
    widths: {
        category: props.config.ui?.widths?.category ?? 224,
        subcategory: props.config.ui?.widths?.subcategory ?? 180,
        month: props.config.ui?.widths?.month ?? 80,
        total: props.config.ui?.widths?.total ?? 120,
        percent: props.config.ui?.widths?.percent ?? 120,
    },
    summaryRow: {
        show: props.config.ui?.summaryRow?.show ?? true,
    }
}));

/* ---------- column widths (all months resizable) ---------- */
type DragIdx = "category" | "subcategory" | `m_${number}` | "total" | "percent";
type DragState = { idx: DragIdx; startX: number; startW: number };

const widths = ref<{
    category: number;
    subcategory: number;
    months: number[]; // one width per month
    total: number;
    percent: number;
}>(getInitialWidths());

function getInitialWidths() {
    const base = {
        category: ui.value.widths.category!,
        subcategory: ui.value.widths.subcategory!,
        months: props.config.months.map(() => ui.value.widths.month!),
        total: ui.value.widths.total!,
        percent: ui.value.widths.percent!,
    };
    if (!ui.value.resizable || !ui.value.storageKey) return base;
    try {
        const raw = localStorage.getItem(ui.value.storageKey);
        if (!raw) return base;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.category === "number") base.category = parsed.category;
        if (typeof parsed?.subcategory === "number") base.subcategory = parsed.subcategory;
        if (Array.isArray(parsed?.months) && parsed.months.length === props.config.months.length) {
            base.months = parsed.months.map((n: number) => Number.isFinite(n) ? n : ui.value.widths.month!);
        }
        if (typeof parsed?.total === "number") base.total = parsed.total;
        if (typeof parsed?.percent === "number") base.percent = parsed.percent;
    } catch { }
    return base;
}

function saveWidths() {
    if (!ui.value.resizable || !ui.value.storageKey) return;
    try { localStorage.setItem(ui.value.storageKey, JSON.stringify(widths.value)); } catch { }
}

const MIN = { category: 140, subcategory: 120, month: 64, total: 96, percent: 96 } as const;
const drag = ref<DragState | null>(null);
function startResize(idx: DragIdx, e: PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    let startW = 0;
    if (idx === "category") startW = widths.value.category;
    else if (idx === "subcategory") startW = widths.value.subcategory;
    else if (idx === "total") startW = widths.value.total;
    else if (idx === "percent") startW = widths.value.percent;
    else {
        const mi = parseInt(idx.slice(2), 10);
        startW = widths.value.months[mi] ?? ui.value.widths.month!;
    }
    drag.value = { idx, startX: e.clientX, startW };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { once: true });
}
function onMove(e: PointerEvent) {
    if (!drag.value) return;
    const dx = e.clientX - drag.value.startX;
    if (drag.value.idx === "category") widths.value.category = Math.max(MIN.category, Math.round(drag.value.startW + dx));
    else if (drag.value.idx === "subcategory") widths.value.subcategory = Math.max(MIN.subcategory, Math.round(drag.value.startW + dx));
    else if (drag.value.idx === "total") widths.value.total = Math.max(MIN.total, Math.round(drag.value.startW + dx));
    else if (drag.value.idx === "percent") widths.value.percent = Math.max(MIN.percent, Math.round(drag.value.startW + dx));
    else {
        const mi = parseInt(drag.value.idx.slice(2), 10);
        const current = widths.value.months.slice();
        current[mi] = Math.max(MIN.month, Math.round(drag.value.startW + dx));
        widths.value.months = current;
    }
}
function onUp() {
    drag.value = null;
    window.removeEventListener("pointermove", onMove);
    saveWidths();
}
onBeforeUnmount(() => window.removeEventListener("pointermove", onMove));

/* grid template for header/body rows */
const gridTemplate = computed(() => {
    const months = widths.value.months.map(w => `${w}px`).join(" ");
    return [
        `${widths.value.category}px`,
        `${widths.value.subcategory}px`,
        months,
        `${widths.value.total}px`,
        `${widths.value.percent}px`,
    ].join(" ");
});

/* ---------- expand/collapse ---------- */
const expanded = ref<Set<number>>(new Set());
function isExpanded(id: number) { return expanded.value.has(id); }
function toggle(id: number) {
    const s = new Set(expanded.value);
    s.has(id) ? s.delete(id) : s.add(id);
    expanded.value = s;
}

/* ---------- summary (bottom line) ---------- */
/* Per-month totals across all root rows */
const monthTotals = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const m of props.config.months) {
        let sum = 0;
        for (const r of props.config.rows) sum += props.config.accessors.catValue(r.id, m.key) || 0;
        map[m.key] = sum;
    }
    return map;
});

/* Grand total = sum of all category totals (should equal sum(monthTotals)) */
const grandTotal = computed(() => {
    let t = 0;
    for (const r of props.config.rows) t += props.config.accessors.catTotal(r.id) || 0;
    return t;
});

/* ---------- transitions ---------- */
function onEnter(el: Element) {
    const e = el as HTMLElement;
    e.style.height = "0px";
    e.style.opacity = "0";
    e.style.transform = "translateY(-4px)";
    requestAnimationFrame(() => {
        e.style.transition = "height .25s ease, opacity .25s ease, transform .25s ease";
        e.style.height = e.scrollHeight + "px";
        e.style.opacity = "1";
        e.style.transform = "translateY(0)";
    });
}
function onAfterEnter(el: Element) {
    const e = el as HTMLElement;
    e.style.transition = "";
    e.style.height = "";
}
function onLeave(el: Element) {
    const e = el as HTMLElement;
    e.style.height = e.scrollHeight + "px";
    e.style.opacity = "1";
    e.style.transform = "translateY(0)";
    void (e as any).offsetHeight;
    e.style.transition = "height .2s ease, opacity .2s ease, transform .2s ease";
    e.style.height = "0px";
    e.style.opacity = "0";
    e.style.transform = "translateY(-4px)";
}
</script>

<template>
    <section class="border rounded bg-white overflow-x-auto p-0">
        <!-- no title block -->

        <div class="min-w-fit">
            <!-- Header -->
            <div class="grid grid-row gap-0 text-sm border-b font-bold divide-x divide-gray-200"
                :class="ui.stickyHeader ? 'bg-gray-50 sticky top-0 z-10' : 'bg-gray-50'"
                :style="{ gridTemplateColumns: gridTemplate }">
                <div class="relative">
                    {{ labels.category }}
                    <span v-if="ui.resizable" class="resizer"
                        @pointerdown="(e) => startResize('category', e as PointerEvent)" />
                </div>
                <div class="relative">
                    {{ labels.subcategory }}
                    <span v-if="ui.resizable" class="resizer"
                        @pointerdown="(e) => startResize('subcategory', e as PointerEvent)" />
                </div>

                <div v-for="(m, mi) in config.months" :key="m.key" class="relative text-right">
                    {{ m.label }}
                    <span v-if="ui.resizable" class="resizer"
                        @pointerdown="(e) => startResize(('m_' + mi) as DragIdx, e as PointerEvent)" />
                </div>

                <div class="relative text-right">
                    {{ labels.total }}
                    <span v-if="ui.resizable" class="resizer"
                        @pointerdown="(e) => startResize('total', e as PointerEvent)" />
                </div>

                <div class="relative text-right">
                    {{ labels.percent }}
                    <span v-if="ui.resizable" class="resizer"
                        @pointerdown="(e) => startResize('percent', e as PointerEvent)" />
                </div>
            </div>

            <!-- Root blocks -->
            <div v-for="cat in config.rows" :key="cat.id" class="border-b">
                <!-- Root row -->
                <div class="grid grid-row gap-0 bg-gray-50/60 text-sm divide-x divide-gray-200 hover:bg-gray-100 cursor-pointer select-none"
                    :style="{ gridTemplateColumns: gridTemplate }" @click="toggle(cat.id)"
                    @keydown.enter.prevent="toggle(cat.id)" @keydown.space.prevent="toggle(cat.id)" role="button"
                    :aria-expanded="isExpanded(cat.id)" tabindex="0">
                    <div class="font-medium flex items-center gap-2">
                        <span class="inline-block transition-transform duration-150 mr-1"
                            :class="isExpanded(cat.id) ? 'rotate-90' : ''">▶</span>
                        <span v-if="cat.color" class="inline-block w-3 h-3 rounded-full"
                            :style="{ background: cat.color! }"></span>
                        <span>{{ cat.name }}</span>
                    </div>
                    <div class="text-gray-400">—</div>

                    <template v-for="m in config.months" :key="m.key">
                        <div class="text-right text-gray-700">
                            {{ config.accessors.format(config.accessors.catValue(cat.id, m.key)) }}
                        </div>
                    </template>

                    <div class="text-right font-medium">
                        {{ config.accessors.format(config.accessors.catTotal(cat.id)) }}
                    </div>

                    <div class="flex items-center gap-2">
                        <div class="w-full h-2 rounded bg-gray-200 overflow-hidden">
                            <div class="h-2" :style="{
                                width: (config.accessors.catPercent(cat.id) || 0).toFixed(2) + '%',
                                background: config.accessors.colorCat(cat.id)
                            }" />
                        </div>
                        <div class="w-14 text-right tabular-nums">
                            {{ (config.accessors.catPercent(cat.id) || 0).toFixed(1) }}%
                        </div>
                    </div>
                </div>

                <!-- Children -->
                <transition name="accordion" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
                    <div v-if="isExpanded(cat.id)">
                        <div v-for="(sub, i) in cat.children" :key="sub.id"
                            class="grid grid-row gap-0 text-sm divide-x divide-gray-200"
                            :class="ui.zebraChildren && i % 2 ? 'bg-primary/10' : ''"
                            :style="{ gridTemplateColumns: gridTemplate }">
                            <div></div>
                            <div class="truncate">{{ sub.name }}</div>

                            <template v-for="m in config.months" :key="m.key">
                                <div class="text-right text-gray-700">
                                    {{ config.accessors.format(config.accessors.subValue(sub.id, m.key)) }}
                                </div>
                            </template>

                            <div class="text-right font-medium">
                                {{ config.accessors.format(config.accessors.subTotal(sub.id)) }}
                            </div>

                            <div class="flex items-center gap-2">
                                <div class="w-full h-2 rounded bg-gray-200 overflow-hidden">
                                    <div class="h-2" :style="{
                                        width: (config.accessors.subPercent(sub.id) || 0).toFixed(2) + '%',
                                        background: config.accessors.colorParent(sub.parentId)
                                    }" />
                                </div>
                                <div class="w-14 text-right tabular-nums">
                                    {{ (config.accessors.subPercent(sub.id) || 0).toFixed(1) }}%
                                </div>
                            </div>
                        </div>
                    </div>
                </transition>
            </div>

            <!-- Bottom summary line -->
            <div v-if="ui.summaryRow.show"
                class="grid grid-row gap-0 text-sm divide-x divide-gray-200 border-t bg-gray-50 font-medium"
                :style="{ gridTemplateColumns: gridTemplate }">
                <!-- label -->
                <div class="px-2">Total</div>
                <!-- subcategory col -->
                <div class="px-2 text-gray-500">—</div>

                <!-- per-month totals -->
                <template v-for="m in config.months" :key="m.key">
                    <div class="px-2 text-right">
                        {{ config.accessors.format(monthTotals[m.key] || 0) }}
                    </div>
                </template>

                <!-- grand total of all totals -->
                <div class="px-2 text-right">
                    {{ config.accessors.format(grandTotal) }}
                </div>

                <!-- percent column = 100% -->
                <div class="px-2 text-right">

                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.grid-row>* {
    padding: 0.5rem;
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

/* accordion */
.accordion-enter-active,
.accordion-leave-active {
    overflow: hidden;
}
</style>
