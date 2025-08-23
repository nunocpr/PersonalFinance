<script setup lang="ts">
import { ref } from "vue";
import Draggable from "vuedraggable";
import { useCategories } from "@/services/categories/categories.store";
import CategoryModal from "./CategoryModal.vue";
import type { Category } from "@/types/categories";
import Button from "../ui/Button.vue";

const props = defineProps<{ nodes: Category[] }>();

const { reorder, addChild, remove, edit, addRoot, getTypeLabelPt } = useCategories();

/* ---------- Modal state ---------- */
const showModal = ref(false);
const modalMode = ref<"create" | "edit">("create");
const modalParent = ref<Category | null>(null);
const modalValue = ref<Category | null>(null);

function openCreateRoot() {
    modalMode.value = "create";
    modalParent.value = null;
    modalValue.value = null;
    showModal.value = true;
}
function openCreateChild(parent: Category) {
    modalMode.value = "create";
    modalParent.value = parent;
    modalValue.value = null;
    showModal.value = true;
}
function openEditRoot(root: Category) {
    modalMode.value = "edit";
    modalParent.value = null;
    modalValue.value = root;
    showModal.value = true;
}
function openEditChild(child: Category, parent: Category) {
    modalMode.value = "edit";
    modalParent.value = parent;
    modalValue.value = child;
    showModal.value = true;
}

async function onSave(payload: { name: string; description: string | null; color?: string | null; type?: any }) {
    if (modalMode.value === "create") {
        if (modalParent.value) {
            await addChild(modalParent.value.id, {
                name: payload.name,
                description: payload.description ?? undefined,
                type: (modalParent.value as any).type,
            } as any);
        } else {
            await addRoot({
                name: payload.name,
                description: payload.description ?? undefined,
                type: payload.type,
                color: payload.color ?? undefined,
            } as any);
        }
    } else if (modalMode.value === "edit" && modalValue.value) {
        const patch: any = { name: payload.name, description: payload.description };
        if (!modalParent.value) {
            patch.type = payload.type;
            patch.color = payload.color ?? null;
        }
        await edit(modalValue.value.id, patch);
    }
}
async function onDelete(cat: Category) {
    if (confirm(`Eliminar "${cat.name}"?`)) await remove(cat.id);
}

/* ---------- Reorder handlers ---------- */
async function onRootsEnd() {
    const orderedIds = props.nodes.map(n => n.id);
    await reorder(null, orderedIds);
}
async function onChildrenEnd(parent: Category) {
    const orderedIds = (parent.children ?? []).map(c => c.id);
    await reorder(parent.id, orderedIds);
}
</script>

<template>
    <div class="space-y-4 mt-12">
        <!-- Top bar action -->
        <div class="flex justify-start">
            <Button variant="primary" size="md" title="Adicionar Categoria" @click="openCreateRoot">Adicionar
                categoria</Button>
        </div>

        <!-- ROOTS -->
        <Draggable :list="props.nodes" item-key="id" handle=".grab" @end="onRootsEnd">
            <template #item="{ element: root }">
                <section class="border rounded-md bg-white p-4 shadow-md mb-2">
                    <!-- Root header -->
                    <div class="flex items-center gap-3">
                        <span class="grab cursor-grab select-none" title="Arrastar para ordenar">⋮⋮</span>

                        <div class="flex-1 min-w-0">
                            <h3 class="font-medium truncate">
                                <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300 shrink-0 mr-1.5"
                                    :style="{ backgroundColor: root.color || '#000' }"></span>

                                {{ root.name }}
                                <span class=" ml-2 text-xs text-gray-600">• {{ getTypeLabelPt((root as
                                    any).type) }}</span>
                            </h3>
                            <p v-if="root.description" class="text-xs text-gray-500 mt-1 truncate">{{ root.description
                            }}</p>
                        </div>

                        <div class="flex items-center gap-2">
                            <Button variant="ghost" size="sm" title="Editar Categoria"
                                @click="openEditRoot(root)">Editar</Button>
                            <Button variant="primary" size="sm" title="Criar subcategoria"
                                @click="openCreateChild(root)">Criar subcategoria</Button>
                            <Button variant="danger" size="sm" title="Eliminar subcategoria"
                                @click="onDelete(root)">Eliminar</Button>
                        </div>
                    </div>

                    <!-- CHILDREN -->
                    <div class="mt-1 pl-7">
                        <Draggable :list="root.children" item-key="id" handle=".grab"
                            :group="{ name: 'children-' + root.id, pull: false, put: false }"
                            @end="() => onChildrenEnd(root)">
                            <template #item="{ element: child }">
                                <div class="flex items-center gap-2 py-1">
                                    <span class="grab cursor-grab select-none" title="Arrastar para ordenar">⋮⋮</span>

                                    <div class="flex-1 min-w-0">
                                        <div class="truncate">
                                            {{ child.name }}
                                            <span class="ml-2 text-xs text-gray-600">• {{ getTypeLabelPt((child as
                                                any).type)
                                                }}</span>
                                        </div>
                                        <p v-if="child.description" class="text-xs text-gray-500 truncate">{{
                                            child.description }}</p>
                                    </div>

                                    <div class="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" title="Editar Categoria"
                                            @click="openEditChild(child, root)">Editar</Button>
                                        <Button variant="danger" size="sm" title="Eliminar subcategoria"
                                            @click="onDelete(child)">Eliminar</Button>

                                    </div>
                                </div>
                            </template>
                        </Draggable>
                    </div>
                </section>
            </template>
        </Draggable>

        <!-- Modal -->
        <CategoryModal v-model:open="showModal" :mode="modalMode" :parent="modalParent" :value="modalValue"
            @save="onSave" />
    </div>
</template>

<style scoped>
.grab {
    padding: 0 4px;
}

/* bigger drag handle */
</style>
