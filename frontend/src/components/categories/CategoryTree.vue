<script setup lang="ts">
import { ref } from "vue";
import Draggable from "vuedraggable";
import { useCategories } from "@/services/categories/categories.store";
import type { Category } from "@/types/categories";

const props = defineProps<{
    nodes: Category[];
}>();

const {
    reorder, addChild, remove, edit, typeLabelsPt, getTypeLabelPt
} = useCategories();

/** Estado de edição inline por ID */
type Draft = { name: string; type: string; };
const editing = ref<Record<number, Draft>>({});

/** Entrar/Cancelar/Guardar edição */
function startEdit(cat: Category) {
    editing.value[cat.id] = {
        name: cat.name ?? "",
        type: (cat as any).type ?? "other",
    };
}
function cancelEdit(id: number) {
    delete editing.value[id];
}
async function saveEdit(id: number) {
    const draft = editing.value[id];
    if (!draft) return;
    await edit(id, { name: draft.name, type: draft.type } as any);
    delete editing.value[id];
}

/** Adicionar subcategoria */
const creatingChildFor = ref<number | null>(null);
const childDraftName = ref("");
const childDraftType = ref<string>(Object.keys(typeLabelsPt)[0] ?? "other");

async function createChild(parent: Category) {
    if (!childDraftName.value.trim()) return;
    await addChild(parent.id, { name: childDraftName.value.trim(), type: childDraftType.value } as any);
    childDraftName.value = "";
    creatingChildFor.value = null;
}

/** Reorder raiz e filhos (apenas entre irmãos) */
async function onRootsEnd() {
    const orderedIds = props.nodes.map((n) => n.id);
    await reorder(null, orderedIds);
}
async function onChildrenEnd(parent: Category) {
    const orderedIds = (parent.children ?? []).map((c) => c.id);
    await reorder(parent.id, orderedIds);
}
</script>

<template>
    <div class="space-y-4">
        <Draggable :list="props.nodes" item-key="id" handle=".grab" @end="onRootsEnd">
            <template #item="{ element: root }">
                <section class="border rounded-md bg-white p-4">
                    <div class="flex items-center gap-3">
                        <span class="grab cursor-grab select-none" title="Arrastar para ordenar">⋮⋮</span>

                        <div class="flex-1 min-w-0">
                            <template v-if="editing[root.id]">
                                <div class="flex flex-wrap items-end gap-3">
                                    <div>
                                        <label for="category-name" class="block text-xs text-gray-600 mb-1">Nome</label>
                                        <input name="category-name" v-model="editing[root.id].name"
                                            class="border rounded px-2 py-1" />
                                    </div>
                                    <div>
                                        <label class="block text-xs text-gray-600 mb-1">Tipo</label>
                                        <select v-model="editing[root.id].type" class="border rounded px-2 py-1">
                                            <option v-for="(label, key) in typeLabelsPt" :key="key" :value="key">{{
                                                label }}</option>
                                        </select>
                                    </div>
                                </div>
                            </template>
                            <template v-else>
                                <h3 class="font-medium truncate">
                                    {{ root.name }}
                                    <span class="ml-2 text-xs text-gray-600">• {{ getTypeLabelPt((root as any).type)
                                        }}</span>
                                </h3>
                            </template>
                        </div>

                        <div class="flex items-center gap-2">
                            <template v-if="editing[root.id]">
                                <button class="cursor-pointer px-2 py-1 rounded bg-black text-white"
                                    @click="saveEdit(root.id)">Guardar</button>
                                <button class="cursor-pointer px-2 py-1 rounded border"
                                    @click="cancelEdit(root.id)">Cancelar</button>
                            </template>
                            <template v-else>
                                <button class="cursor-pointer px-2 py-1 rounded border"
                                    @click="startEdit(root)">Editar</button>
                                <button class="cursor-pointer px-2 py-1 rounded border"
                                    @click="creatingChildFor = root.id">Adicionar subcategoria</button>
                                <button class="cursor-pointer px-2 py-1 rounded border border-red-300 text-red-600"
                                    @click="remove(root.id)">Eliminar</button>
                            </template>
                        </div>
                    </div>

                    <div v-if="creatingChildFor === root.id" class="mt-3 pl-7">
                        <div class="flex flex-wrap items-end gap-3">
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">Nome</label>
                                <input v-model="childDraftName" class="border rounded px-2 py-1" />
                            </div>
                            <div>
                                <label class="block text-xs text-gray-600 mb-1">Tipo</label>
                                <select v-model="childDraftType" class="border rounded px-2 py-1">
                                    <option v-for="(label, key) in typeLabelsPt" :key="key" :value="key">{{ label }}
                                    </option>
                                </select>
                            </div>
                            <div class="flex items-center gap-2">
                                <button class="cursor-pointer px-2 py-1 rounded bg-black text-white"
                                    @click="createChild(root)">Adicionar</button>
                                <button class="cursor-pointer px-2 py-1 rounded border"
                                    @click="creatingChildFor = null">Cancelar</button>
                            </div>
                        </div>
                    </div>

                    <div class="mt-3 pl-7">
                        <Draggable :list="root.children" item-key="id" handle=".grab"
                            :group="{ name: 'children-' + root.id, pull: false, put: false }"
                            @end="() => onChildrenEnd(root)">
                            <template #item="{ element: child }">
                                <div class="flex items-center gap-3 py-1">
                                    <span class="grab cursor-grab select-none" title="Arrastar para ordenar">⋮⋮</span>

                                    <div class="flex-1 min-w-0">
                                        <template v-if="editing[child.id]">
                                            <div class="flex flex-wrap items-end gap-3">
                                                <div>
                                                    <label for="category-name"
                                                        class="block text-xs text-gray-600 mb-1">Nome</label>
                                                    <input v-model="editing[child.id].name"
                                                        class="border rounded px-2 py-1" />
                                                </div>
                                                <div>
                                                    <label class="block text-xs text-gray-600 mb-1">Tipo</label>
                                                    <select v-model="editing[child.id].type"
                                                        class="border rounded px-2 py-1">
                                                        <option v-for="(label, key) in typeLabelsPt" :key="key"
                                                            :value="key">{{ label }}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </template>
                                        <template v-else>
                                            <div class="truncate">
                                                {{ child.name }}
                                                <span class="ml-2 text-xs text-gray-600">• {{ getTypeLabelPt((child as
                                                    any).type) }}</span>
                                            </div>
                                        </template>
                                    </div>

                                    <div class="flex items-center gap-2">
                                        <template v-if="editing[child.id]">
                                            <button class="cursor-pointer px-2 py-1 rounded bg-black text-white"
                                                @click="saveEdit(child.id)">Guardar</button>
                                            <button class="cursor-pointer px-2 py-1 rounded border"
                                                @click="cancelEdit(child.id)">Cancelar</button>
                                        </template>
                                        <template v-else>
                                            <button class="cursor-pointer px-2 py-1 rounded border"
                                                @click="startEdit(child)">Editar</button>
                                            <button
                                                class="cursor-pointer px-2 py-1 rounded border border-red-300 text-red-600"
                                                @click="remove(child.id)">Eliminar</button>
                                        </template>
                                    </div>
                                </div>
                            </template>
                        </Draggable>
                    </div>
                </section>
            </template>
        </Draggable>
    </div>
</template>

<style scoped>
/* melhora a área de arrasto em dispositivos apontadores */
.grab {
    padding: 0 4px;
}
</style>
