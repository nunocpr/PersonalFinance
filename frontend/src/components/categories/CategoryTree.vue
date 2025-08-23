<script setup lang="ts">
import { ref } from "vue";
import Draggable from "vuedraggable";
import { useCategories } from "@/services/categories/categories.store";
import CategoryModal from "./CategoryModal.vue";
import type { Category } from "@/types/categories";
import Button from "../ui/Button.vue";
import { ChevronDown, Pencil, Trash2, Plus } from "lucide-vue-next";

const props = defineProps<{ nodes: Category[] }>();
const { reorder, addChild, remove, edit, addRoot, getTypeLabelPt } = useCategories();

/* ---------- Modal state ---------- */
const showModal = ref(false);
const modalMode = ref<"create" | "edit">("create");
const modalParent = ref<Category | null>(null);
const modalValue = ref<Category | null>(null);

function openCreateRoot() { modalMode.value = "create"; modalParent.value = null; modalValue.value = null; showModal.value = true; }
function openCreateChild(parent: Category) { modalMode.value = "create"; modalParent.value = parent; modalValue.value = null; showModal.value = true; }
function openEditRoot(root: Category) { modalMode.value = "edit"; modalParent.value = null; modalValue.value = root; showModal.value = true; }
function openEditChild(child: Category, parent: Category) { modalMode.value = "edit"; modalParent.value = parent; modalValue.value = child; showModal.value = true; }

async function onSave(payload: { name: string; description: string | null; color?: string | null; type?: any }) {
    if (modalMode.value === "create") {
        if (modalParent.value) {
            await addChild(modalParent.value.id, { name: payload.name, description: payload.description ?? undefined, type: (modalParent.value as any).type } as any);
        } else {
            await addRoot({ name: payload.name, description: payload.description ?? undefined, type: payload.type, color: payload.color ?? undefined } as any);
        }
    } else if (modalMode.value === "edit" && modalValue.value) {
        const patch: any = { name: payload.name, description: payload.description };
        if (!modalParent.value) { patch.type = payload.type; patch.color = payload.color ?? null; }
        await edit(modalValue.value.id, patch);
    }
}
async function onDelete(cat: Category) { if (confirm(`Eliminar "${cat.name}"?`)) await remove(cat.id); }

/* ---------- Reorder handlers ---------- */
async function onRootsEnd() { await reorder(null, props.nodes.map(n => n.id)); }
async function onChildrenEnd(parent: Category) { await reorder(parent.id, (parent.children ?? []).map(c => c.id)); }

/* ---------- Accordion state ---------- */
const openIds = ref<Set<number>>(new Set());
const isOpen = (id: number) => openIds.value.has(id);
function toggle(id: number) {
    const s = new Set(openIds.value);
    s.has(id) ? s.delete(id) : s.add(id);
    openIds.value = s;
}
</script>

<template>
    <div class="space-y-4">
        <!-- Top bar action -->
        <div class="flex justify-start">
            <Button variant="primary" size="md" title="Adicionar Categoria" @click="openCreateRoot">
                Adicionar categoria
            </Button>
        </div>

        <!-- ROOTS -->
        <Draggable :list="props.nodes" item-key="id" handle=".grab" @end="onRootsEnd" class="mt-4 md:mt-8 space-y-3">
            <template #item="{ element: root }">

                <section class="border rounded-md bg-white shadow-sm">
                    <button type="button"
                        class="ml-1 rounded  p-3 sm:p-4  cursor-pointer hover:bg-primary/10 transition-colors w-full"
                        :aria-expanded="isOpen(root.id)" :aria-controls="'sub-' + root.id" @click="toggle(root.id)"
                        :title="isOpen(root.id) ? 'Fechar subcategorias' : 'Abrir subcategorias'">
                        <!-- Root header -->
                        <div class="flex items-center gap-3">
                            <span class="grab cursor-grab select-none text-gray-400"
                                title="Arrastar para ordenar">⋮⋮</span>

                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300 shrink-0"
                                        :style="{ backgroundColor: root.color || '#000' }"></span>
                                    <span class="font-medium truncate">{{ root.name }}</span>

                                    <span
                                        class="ml-1 inline-flex items-center rounded-full border px-2 py-[2px] text-[11px] text-gray-700 bg-gray-50 whitespace-nowrap">
                                        {{ getTypeLabelPt((root as any).type) }}
                                    </span>
                                    <span class="ml-1 text-xs text-gray-500 whitespace-nowrap">
                                        • {{ root.children?.length || 0 }} sub
                                    </span>
                                </div>
                                <p v-if="root.description"
                                    class="text-xs text-gray-500 mt-2 truncate sm:whitespace-normal">
                                    {{ root.description }}
                                </p>
                            </div>

                            <!-- Actions (now xs) -->
                            <div class="flex items-center gap-1 sm:gap-2 shrink-0">
                                <Button variant="primary" size="xs" title="Criar subcategoria"
                                    @click.stop="openCreateChild(root)">
                                    <Plus class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="xs" title="Editar categoria"
                                    @click.stop="openEditRoot(root)">
                                    <Pencil class="w-4 h-4" />
                                </Button>
                                <Button variant="danger" size="xs" title="Eliminar categoria"
                                    @click.stop="onDelete(root)">
                                    <Trash2 class="w-4 h-4" />
                                </Button>
                            </div>
                            <ChevronDown class="w-4 h-4 text-gray-500 transition-transform duration-200 ease-in-out"
                                :class="isOpen(root.id) ? 'rotate-180' : ''" />
                        </div>

                        <!-- SUBCATEGORIES (accordion panel) -->
                        <div v-show="isOpen(root.id)" :id="'sub-' + root.id" class="mt-3 border-t pt-3">
                            <Draggable :list="root.children" item-key="id" handle=".grab"
                                :group="{ name: 'children-' + root.id, pull: false, put: false }"
                                @end="() => onChildrenEnd(root)">
                                <template #item="{ element: child, index }">
                                    <div
                                        class="flex items-center gap-2 py-2 px-1 rounded odd:bg-primary/5 even:bg-primary/10 hover:bg-primary/10">
                                        <span class="grab cursor-grab select-none text-gray-400"
                                            title="Arrastar para ordenar">⋮⋮</span>

                                        <div class="flex-1 flex min-w-0">
                                            <div class="truncate ml-2 md:ml-6">{{ child.name }}</div>
                                            <p v-if="child.description" class="text-xs text-gray-500 truncate">
                                                {{ child.description }}
                                            </p>
                                        </div>

                                        <div class="flex items-center gap-1 mr-6">
                                            <Button variant="ghost" size="xs" title="Editar subcategoria"
                                                @click.stop="openEditChild(child, root)">
                                                <Pencil class="w-4 h-4" />
                                            </Button>
                                            <Button variant="danger" size="xs" title="Eliminar subcategoria"
                                                @click.stop="onDelete(child)">
                                                <Trash2 class="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </template>
                            </Draggable>
                        </div>
                    </button>
                </section>

            </template>
        </Draggable>

        <!-- Modal -->
        <CategoryModal v-model:open="showModal" :mode="modalMode" :parent="modalParent" :value="modalValue"
            @save="onSave" />
    </div>
</template>
