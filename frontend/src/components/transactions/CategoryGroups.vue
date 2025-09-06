<script setup lang="ts">
import { ref, watch } from "vue";
import Button from "@/components/ui/Button.vue";
import { Pencil, Trash2, ChevronDown } from "lucide-vue-next";
import { TransactionService } from "@/services/transactions/transactions.service";
import { formatCentsEUR } from "@/utils/money";

type Filters = {
    q?: string;
    from?: string;
    to?: string;
    sortBy: "date" | "amount";
    sortDir: "asc" | "desc";
};

const props = defineProps<{
    accountId: number | null;
    filters: Filters;
    templateColumns: string;
    displayNameById: Map<number, string>;
    childColorById: Map<number, string | null>;
}>();

const emit = defineEmits<{
    (e: "edit", t: any): void;
    (e: "remove", id: string): void;
    (e: "pick", payload: { id: string; categoryId: number | null }): void;
}>();

type CategoryGroup = {
    categoryId: number | null;
    count: number;
    sum: number;
    minDate: string | null;
    maxDate: string | null;
    categoryName: string | null;
    parentName: string | null;
    color: string | null;
    items: any[];
};

const groups = ref<CategoryGroup[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const catKey = (id: number | null) => (id == null ? "null" : String(id));
const catLabel = (g: CategoryGroup) => {
    if (g.categoryId == null) return "— Sem categoria —";
    const full = props.displayNameById.get(g.categoryId);
    if (full) return full;
    if (g.parentName && g.categoryName) return `${g.parentName} / ${g.categoryName}`;
    return g.categoryName || `#${g.categoryId}`;
};
const catColor = (g: CategoryGroup) =>
    g.categoryId == null ? "transparent" : props.childColorById.get(g.categoryId || 0) || g.color || "transparent";

async function loadGroups() {
    if (props.accountId == null) {
        groups.value = [];
        return;
    }
    loading.value = true;
    error.value = null;
    const prevOpen = new Set(openSet.value);

    try {
        const res = await TransactionService.groupByCategory({
            accountId: props.accountId,
            ...props.filters,
        } as any);
        const arr: CategoryGroup[] = Array.isArray(res?.groups) ? res.groups as CategoryGroup[] : [];
        // sort alphabetically by label (tweak as you like)
        groups.value = arr.sort((a, b) => catLabel(a).localeCompare(catLabel(b), "pt-PT"));

        // reset accordion state
        openSet.value = new Set();

        // preserve accordion state (remove keys that no longer exist)
        const valid = new Set(arr.map(g => catKey(g.categoryId)));
        openSet.value = new Set([...prevOpen].filter(k => valid.has(k)));
    } catch (e: any) {
        error.value = e?.message || "Falha ao carregar grupos.";
        groups.value = [];
    } finally {
        loading.value = false;
    }
}

/* Accordion state (default closed) */
const openSet = ref<Set<string>>(new Set());
const isOpen = (id: number | null) => openSet.value.has(catKey(id));
function toggle(id: number | null) {
    const k = catKey(id);
    if (openSet.value.has(k)) openSet.value.delete(k);
    else openSet.value.add(k);
    openSet.value = new Set(openSet.value);
}

/* Reload whenever account or filters change */
watch(() => [props.accountId, props.filters], loadGroups, { immediate: true, deep: true });

// allow parent to trigger a reload without remounting
defineExpose({ reload: loadGroups });
</script>

<template>
    <li v-if="error" class="px-3 py-3 text-sm text-red-600">{{ error }}</li>

    <template v-else-if="groups.length">
        <li v-for="g in groups" :key="catKey(g.categoryId)" class="p-0">
            <!-- Accordion header -->
            <button type="button" class="w-full flex items-center gap-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 border-b"
                @click="toggle(g.categoryId)">
                <ChevronDown class="w-4 h-4 text-gray-500 transition-transform"
                    :class="isOpen(g.categoryId) ? 'rotate-180' : ''" />
                <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300"
                    :style="{ backgroundColor: catColor(g) }" />
                <span class="font-medium truncate">{{ catLabel(g) }}</span>
                <span class="ml-auto text-xs text-gray-600">
                    {{ g.count }} tx •
                    <strong :class="g.sum < 0 ? 'text-red-600' : 'text-green-700'">{{ formatCentsEUR(g.sum) }}</strong>
                </span>
            </button>

            <!-- Accordion body -->
            <transition name="acc">
                <div v-show="isOpen(g.categoryId)">
                    <ul v-if="g.items && g.items.length" class="divide-y">
                        <li v-for="t in g.items" :key="t.id" class="grid gap-x-4 px-3 py-3"
                            :style="{ gridTemplateColumns: templateColumns }">
                            <div class="text-gray-700 whitespace-nowrap">{{ t.date?.slice(0, 10) }}</div>

                            <div class="truncate flex items-center gap-2">
                                <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300 shrink-0"
                                    :style="{ backgroundColor: childColorById.get(t.categoryId || 0) || 'transparent' }" />
                                <Button variant="ghost" size="xs" title="Definir categoria"
                                    @click.stop="emit('pick', { id: t.id, categoryId: t.categoryId ?? null })">
                                    {{ displayNameById.get(t.categoryId || 0) || "Definir categoria…" }}
                                </Button>
                            </div>

                            <div class="whitespace-nowrap">
                                <span :class="t.amount < 0 ? 'text-red-600' : 'text-green-700'">{{
                                    formatCentsEUR(t.amount) }}</span>
                            </div>

                            <div class="text-gray-800 truncate">{{ t.description || "—" }}</div>
                            <div class="text-gray-700 truncate">{{ t.notes || "—" }}</div>

                            <div class="whitespace-nowrap flex items-center gap-2">
                                <Button variant="ghost" size="xs" title="Editar" @click.stop="emit('edit', t)">
                                    <Pencil class="w-4 h-4" />
                                </Button>
                                <Button variant="danger" size="xs" title="Eliminar" @click.stop="emit('remove', t.id)">
                                    <Trash2 class="w-4 h-4" />
                                </Button>
                            </div>
                        </li>
                    </ul>

                    <div v-else class="text-sm text-gray-500 px-3 py-2">Sem transações neste grupo.</div>
                </div>
            </transition>
        </li>
    </template>

    <li v-else class="px-3 py-6 text-center text-gray-500">
        {{ loading ? "A carregar…" : "Sem grupos para os filtros atuais." }}
    </li>
</template>
