<!-- src/components/analytics/CategoryFilterModal.vue -->
<script setup lang="ts">

import { computed, defineOptions, nextTick, onMounted, ref, watch } from "vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import Button from "@/components/ui/Button.vue";

type Kind = "expense" | "income";
type SubRow = { id: number; name: string; parentId: number };
type RootRow = { id: number; name: string; color: string | null; type: Kind; children: SubRow[] };

const props = withDefaults(defineProps<{
    open: boolean;
    kind: Kind;
    roots: RootRow[];
    /** initial selection (optional) */
    selectedRootIds?: number[];
    selectedSubIds?: number[];
    /** show search input */
    searchable?: boolean;
    /** persist selection across sessions */
    localStorageKey?: string;
}>(), {
    searchable: true,
});

const emit = defineEmits<{
    (e: "update:open", v: boolean): void;
    (e: "apply", payload: { rootIds: number[]; subIds: number[] }): void;
}>();

/** ---------- Local state (sets) ---------- */
const rootSet = ref<Set<number>>(new Set());
const subSet = ref<Set<number>>(new Set());
const q = ref("");

/** ---------- Persistence ---------- */
type PersistShape = { kind: Kind; rootIds: number[]; subIds: number[]; ts: number };
function loadFromStorage() {
    if (!props.localStorageKey) return false;
    try {
        const raw = localStorage.getItem(props.localStorageKey);
        if (!raw) return false;
        const saved = JSON.parse(raw) as PersistShape;
        if (!saved || saved.kind !== props.kind) return false;
        rootSet.value = new Set(saved.rootIds || []);
        subSet.value = new Set(saved.subIds || []);
        return true;
    } catch { return false; }
}
function saveToStorage() {
    if (!props.localStorageKey) return;
    const payload: PersistShape = {
        kind: props.kind,
        rootIds: Array.from(rootSet.value),
        subIds: Array.from(subSet.value),
        ts: Date.now(),
    };
    localStorage.setItem(props.localStorageKey, JSON.stringify(payload));
}

/** ---------- Init from props or storage ---------- */
function applyInitialSelection() {
    // 1) storage (if present)
    if (loadFromStorage()) return;

    // 2) props
    rootSet.value = new Set(props.selectedRootIds || []);
    subSet.value = new Set(props.selectedSubIds || []);
}
watch(() => props.open, (o) => { if (o) applyInitialSelection(); }, { immediate: true });
watch([() => props.selectedRootIds, () => props.selectedSubIds], () => {
    // if parent updates initial values (e.g., resetting)
    if (!props.open) return;
    rootSet.value = new Set(props.selectedRootIds || []);
    subSet.value = new Set(props.selectedSubIds || []);
});

/** ---------- Filtered roots (by kind and search) ---------- */
const visibleRoots = computed<RootRow[]>(() => {
    const kindFiltered = (props.roots || []).filter(r => r.type === props.kind);
    if (!props.searchable || !q.value.trim()) return kindFiltered;
    const needle = q.value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const match = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().includes(needle);
    return kindFiltered
        .map(r => {
            if (match(r.name)) return r;
            const kids = (r.children || []).filter(c => match(c.name));
            return kids.length ? { ...r, children: kids } : null;
        })
        .filter(Boolean) as RootRow[];
});

/** ---------- Selection helpers ---------- */
function isRootFullySelected(root: RootRow): boolean {
    if (rootSet.value.has(root.id)) return true;
    const kids = root.children || [];
    if (!kids.length) return false;
    return kids.every(k => subSet.value.has(k.id));
}
function isRootPartiallySelected(root: RootRow): boolean {
    if (isRootFullySelected(root)) return false;
    const kids = root.children || [];
    return kids.some(k => subSet.value.has(k.id));
}

function selectRoot(root: RootRow) {
    rootSet.value.add(root.id);
    // Clean up: if root selected, we don't need children explicitly in subSet
    for (const c of root.children || []) subSet.value.delete(c.id);
}
function unselectRoot(root: RootRow) {
    rootSet.value.delete(root.id);
    for (const c of root.children || []) subSet.value.delete(c.id);
}
function toggleRoot(root: RootRow) {
    if (isRootFullySelected(root)) {
        unselectRoot(root);
    } else {
        selectRoot(root);
    }
}

function toggleSub(root: RootRow, sub: SubRow) {
    // touching a child always clears the root selection (be explicit)
    rootSet.value.delete(root.id);
    if (subSet.value.has(sub.id)) subSet.value.delete(sub.id);
    else subSet.value.add(sub.id);

    // If *all* children are now selected, collapse selection to the root
    const kids = root.children || [];
    if (kids.length && kids.every(k => subSet.value.has(k.id))) {
        for (const k of kids) subSet.value.delete(k.id);
        rootSet.value.add(root.id);
    }
}

/** Select / Deselect all currently visible */
function selectAllVisible() {
    for (const r of visibleRoots.value) selectRoot(r);
}
function clearAllVisible() {
    for (const r of visibleRoots.value) unselectRoot(r);
}

/** Clear everything (regardless of visibility) */
function clearAll() {
    rootSet.value.clear();
    subSet.value.clear();
}

/** ---------- Indeterminate visuals ---------- */
/* We’ll set the native checkbox.indeterminate on the next tick */
const rootCheckboxRefs = ref<Record<number, HTMLInputElement | null>>({});
watch([visibleRoots, rootSet, subSet, q], async () => {
    await nextTick();
    for (const r of visibleRoots.value) {
        const el = rootCheckboxRefs.value[r.id];
        if (el) el.indeterminate = isRootPartiallySelected(r);
    }
});

/** ---------- Actions ---------- */
function close() { emit("update:open", false); }
function onApply() {
    const payload = {
        rootIds: Array.from(rootSet.value),
        subIds: Array.from(subSet.value),
    };
    saveToStorage();
    emit("apply", payload);
    close();
}



</script>

<template>
    <BaseModal :open="open" maxWidth="3xl" @update:open="(v) => emit('update:open', v)">
        <template #header>
            <div class="flex items-center justify-between gap-4">
                <h2 id="cat-filter-title" class="text-lg font-semibold">
                    Filtrar categorias — {{ kind === 'expense' ? 'Despesas' : 'Receitas' }}
                </h2>
                <div class="text-sm text-gray-500">
                    <span class="mr-3">Raízes: {{ rootSet.size }}</span>
                    <span>Subcats: {{ subSet.size }}</span>
                </div>
            </div>
        </template>

        <!-- Controls -->
        <div class="flex flex-wrap items-end justify-between gap-3">
            <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" @click="selectAllVisible" title="Selecionar tudo visível">
                    Selecionar visíveis
                </Button>
                <Button variant="ghost" size="sm" @click="clearAllVisible" title="Limpar tudo visível">
                    Limpar visíveis
                </Button>
                <Button variant="ghost" size="sm" @click="clearAll" title="Limpar tudo">
                    Limpar tudo
                </Button>
            </div>

            <div v-if="searchable" class="ml-auto">
                <input v-model="q" type="search" class="border rounded px-3 py-1 text-sm"
                    placeholder="Pesquisar categorias…" />
            </div>
        </div>

        <!-- List -->
        <div class="mt-3 grid gap-3">
            <div v-for="root in visibleRoots" :key="root.id" class="border rounded">
                <!-- root row -->
                <div class="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b">
                    <input :ref="el => (rootCheckboxRefs[root.id] = el as HTMLInputElement)" type="checkbox"
                        :checked="isRootFullySelected(root)" @change="toggleRoot(root)" />
                    <span class="inline-block w-3 h-3 rounded-full ring-1 ring-gray-300"
                        :style="{ background: root.color || '#cbd5e1' }" />
                    <div class="font-medium">{{ root.name }}</div>
                    <div class="ml-auto text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                        title="N.º de subcategorias">
                        {{ root.children?.length || 0 }}
                    </div>
                </div>

                <!-- children -->
                <div class="px-3 py-2 grid sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1">
                    <label v-for="c in root.children || []" :key="c.id" class="flex items-center gap-2 py-1">
                        <input type="checkbox" :checked="rootSet.has(root.id) ? true : subSet.has(c.id)"
                            :disabled="rootSet.has(root.id)" @change="toggleSub(root, c)" />
                        <span class="truncate">{{ c.name }}</span>
                    </label>
                </div>
            </div>

            <div v-if="!visibleRoots.length" class="text-center text-gray-500 py-8">
                Sem categorias para mostrar.
            </div>
        </div>

        <template #footer>
            <div class="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" @click="close">Cancelar</Button>
                <Button variant="primary" size="sm" @click="onApply">Aplicar</Button>
            </div>
        </template>
    </BaseModal>
</template>

<style scoped>
/* simple visual hint when checkbox is indeterminate; the native state is set in script */
input[type="checkbox"]:indeterminate {
    /* Some browsers need explicit style to make it noticeable */
    accent-color: #6b7280;
}
</style>
