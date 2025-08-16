<!-- src/components/transactions/CategoryPickerModal.vue -->
<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useCategories } from "@/services/categories/categories.store";
import type { Category } from "@/types/categories";
import { ArrowLeft, Star, StarOff, ChevronRight } from "lucide-vue-next";

type Emits = {
    (e: "update:open", v: boolean): void;
    (e: "pick", payload: { categoryId: number }): void; // only subcategories
    (e: "set-default", payload: { categoryId: number }): void; // only subcategories
};
const emit = defineEmits<Emits>();

const props = defineProps<{
    open: boolean;
    // the account is used to lookup/store default subcategory
    accountId: number | null;
    // current category id of the transaction (optional; for highlighting)
    currentCategoryId?: number | null;
    // pre-resolved defaults (optional): good for SSR/tests; otherwise we compute in parent
    defaultCategoryId?: number | null;
}>();

const { roots, load } = useCategories();

type Stage =
    | { view: "roots" }
    | { view: "children"; parent: Category };

const state = reactive<{
    stage: Stage;
}>({ stage: { view: "roots" } });

watch(() => props.open, (o) => {
    if (!o) return;
    // reset to roots whenever modal opens
    state.stage = { view: "roots" };
    // ensure categories are available
    load().catch(() => { });
});

function close() { emit("update:open", false); }

const defaultSubId = computed(() => props.defaultCategoryId ?? null);

function showChildren(parent: Category) {
    state.stage = { view: "children", parent };
}
function backToRoots() {
    state.stage = { view: "roots" };
}
</script>

<template>
    <teleport to="body">
        <div v-if="open" class="fixed inset-0 z-[9999] grid place-items-center bg-black/40" @click.self="close">
            <div class="bg-white rounded-xl w-full max-w-lg p-0 overflow-hidden shadow-xl">
                <!-- Header -->
                <div class="flex items-center gap-2 border-b px-4 py-3">
                    <button v-if="state.stage.view === 'children'"
                        class="p-2 -ml-2 rounded hover:bg-gray-100 cursor-pointer" @click="backToRoots" title="Voltar">
                        <ArrowLeft class="w-5 h-5" />
                    </button>
                    <h3 class="font-heading text-lg">
                        {{ state.stage.view === 'roots' ? 'Categorias' : state.stage.parent.name }}
                    </h3>
                </div>

                <!-- Content -->
                <div class="max-h-[65vh] overflow-auto px-2 py-2">
                    <!-- Roots -->
                    <ul v-if="state.stage.view === 'roots'" class="divide-y rounded-md">
                        <li v-for="root in roots" :key="root.id"
                            class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            @click="showChildren(root)">
                            <div class="flex items-center gap-2">
                                <span v-if="root.color" class="inline-block w-3 h-3 rounded-full"
                                    :style="{ background: root.color! }" />
                                <span class="font-medium">{{ root.name }}</span>
                            </div>
                            <ChevronRight class="w-4 h-4 text-gray-500" />
                        </li>
                    </ul>

                    <!-- Children of selected root -->
                    <ul v-else class="divide-y rounded-md">
                        <li v-for="child in (state.stage.parent.children || [])" :key="child.id"
                            class="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                            <button class="flex-1 text-left cursor-pointer"
                                :class="child.id === (currentCategoryId ?? 0) ? 'font-medium' : ''"
                                @click="$emit('pick', { categoryId: child.id })" title="Selecionar">
                                {{ child.name }}
                            </button>

                            <!-- Default star -->
                            <button class="ml-3 p-1 rounded hover:bg-gray-100 cursor-pointer"
                                :title="child.id === defaultSubId ? 'Predefinida' : 'Definir como predefinida'"
                                @click="$emit('set-default', { categoryId: child.id })">
                                <Star v-if="child.id === defaultSubId" class="w-5 h-5 text-amber-500 fill-amber-500" />
                                <StarOff v-else class="w-5 h-5 text-gray-500" />
                            </button>
                        </li>

                        <li v-if="!(state.stage.parent.children && state.stage.parent.children.length)"
                            class="px-3 py-2 text-sm text-gray-500">
                            Sem subcategorias.
                        </li>
                    </ul>
                </div>

                <!-- Footer -->
                <div class="border-t px-4 py-3 flex justify-end">
                    <button class="px-3 py-1.5 rounded border cursor-pointer" @click="close">Cancelar</button>
                </div>
            </div>
        </div>
    </teleport>
</template>
