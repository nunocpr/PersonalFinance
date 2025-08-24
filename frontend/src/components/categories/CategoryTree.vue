<script setup lang="ts">
import { ref } from "vue";
import Draggable from "vuedraggable";
import { useCategories } from "@/services/categories/categories.store";
import CategoryModal from "./CategoryModal.vue";
import type { Category } from "@/types/categories";
import Button from "../ui/Button.vue";
import { ChevronDown, Pencil, Trash2, Plus, MoreVertical } from "lucide-vue-next";

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

function closeMenu(e: Event) {
    const d = (e.currentTarget as HTMLElement).closest('details') as HTMLDetailsElement | null;
    if (d) d.open = false;
}
</script>

<template>
    <div class="space-y-4">
        <div class="flex justify-start">
            <Button variant="primary" size="md" title="Adicionar Categoria" @click="openCreateRoot">
                Adicionar categoria
            </Button>
        </div>

        <!-- ROOTS -->
        <Draggable :list="props.nodes" item-key="id" handle=".grab" @end="onRootsEnd" class="mt-4 md:mt-8 space-y-3">
            <template #item="{ element: root }">
                <section class="border rounded-md bg-white shadow-sm">
                    <!-- HEADER -->
                    <div class="rounded p-3 sm:p-4 cursor-pointer hover:bg-primary/10 transition-colors w-full"
                        role="button" tabindex="0" :aria-expanded="isOpen(root.id)" :aria-controls="'sub-' + root.id"
                        @click="toggle(root.id)" @keydown.enter.prevent="toggle(root.id)"
                        @keydown.space.prevent="toggle(root.id)"
                        :title="isOpen(root.id) ? 'Fechar subcategorias' : 'Abrir subcategorias'">
                        <div class="flex items-center gap-3">
                            <span class="grab cursor-grab select-none text-gray-400"
                                title="Arrastar para ordenar">⋮⋮</span>

                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300 shrink-0"
                                        :style="{ backgroundColor: root.color || '#000' }"></span>
                                    <span class="font-medium truncate">{{ root.name }}</span>

                                    <!-- hide chip & count on mobile -->
                                    <span
                                        class="hidden sm:inline-flex items-center rounded-full border px-2 py-[2px] text-[11px] text-gray-700 bg-gray-50 whitespace-nowrap">
                                        {{ getTypeLabelPt((root as any).type) }}
                                    </span>
                                    <span class="hidden sm:inline text-xs text-gray-500 whitespace-nowrap">
                                        • {{ root.children?.length || 0 }} sub
                                    </span>
                                </div>

                                <!-- hide description on mobile -->
                                <p v-if="root.description" class="hidden sm:block text-xs text-gray-500 mt-2">
                                    {{ root.description }}
                                </p>
                            </div>

                            <!-- Actions -->
                            <div class="no-drag shrink-0 flex items-center">
                                <!-- Desktop/tablet: 3 buttons -->
                                <div class="hidden sm:flex items-center gap-1 sm:gap-2" @click.stop>
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

                                <!-- Mobile: compact menu -->
                                <!-- Mobile: compact menu -->
                                <details class="relative sm:hidden">
                                    <!-- make the summary the button; stop propagation so the row header doesn't toggle -->
                                    <summary
                                        class="list-none inline-flex items-center rounded border px-2 py-1 hover:bg-gray-50 cursor-pointer"
                                        @click.stop>
                                        <MoreVertical class="w-4 h-4" />
                                    </summary>

                                    <ul class="absolute right-0 z-30 mt-1 w-44 rounded border bg-white shadow-md p-1">
                                        <li>
                                            <Button variant="ghost"
                                                class="w-full justify-start text-left !py-6 rounded hover:bg-gray-100 text-sm border-none"
                                                @click.stop="openCreateChild(root); closeMenu($event)">
                                                Adicionar subcategoria
                                            </Button>
                                        </li>
                                        <li>
                                            <Button variant="ghost"
                                                class="w-full justify-start text-left !py-6 rounded hover:bg-gray-100 text-sm border-none"
                                                @click.stop="openEditRoot(root); closeMenu($event)">
                                                Editar
                                            </Button>
                                        </li>
                                        <li>
                                            <Button variant="danger"
                                                class="w-full justify-start text-left px-3 py-2 rounded hover:bg-red-50 text-sm text-red-700"
                                                @click.stop="onDelete(root); closeMenu($event)">
                                                Eliminar
                                            </Button>
                                        </li>
                                    </ul>
                                </details>

                            </div>

                            <ChevronDown class="w-4 h-4 text-gray-500 transition-transform duration-200 ease-in-out"
                                :class="isOpen(root.id) ? 'rotate-180' : ''" />
                        </div>
                    </div>

                    <!-- SUBCATEGORIES -->
                    <transition name="acc">
                        <div v-show="isOpen(root.id)" :id="'sub-' + root.id"
                            class="px-3 sm:px-4 border-t overflow-hidden">
                            <Draggable v-if="isOpen(root.id)" :key="'subs-' + root.id" :list="(root.children || [])"
                                item-key="id" :animation="180" :filter="'.no-drag'" :preventOnFilter="true"
                                :group="{ name: 'children-' + root.id, pull: false, put: false }"
                                @end="() => onChildrenEnd(root)">
                                <template #item="{ element: child }">
                                    <div
                                        class="flex items-center gap-2 py-2 px-1 rounded odd:bg-primary/5 even:bg-primary/10 hover:bg-primary/10 cursor-grab select-none">
                                        <span class="text-gray-400">⋮⋮</span>

                                        <div class="flex-1 flex min-w-0 items-baseline gap-2">
                                            <div class="truncate ml-2 md:ml-6">{{ child.name }}</div>
                                            <!-- hide description on mobile -->
                                            <p v-if="child.description"
                                                class="hidden sm:block text-xs text-gray-500 truncate">
                                                {{ child.description }}
                                            </p>
                                        </div>

                                        <!-- Child actions -->
                                        <div class="no-drag shrink-0 flex items-center">
                                            <!-- ≥sm: buttons -->
                                            <div class="hidden sm:flex items-center gap-1 mr-2" @click.stop>
                                                <Button variant="ghost" size="xs" title="Editar subcategoria"
                                                    @click.stop="openEditChild(child, root)">
                                                    <Pencil class="w-4 h-4" />
                                                </Button>
                                                <Button variant="danger" size="xs" title="Eliminar subcategoria"
                                                    @click.stop="onDelete(child)">
                                                    <Trash2 class="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <!-- Mobile: menu -->
                                            <details class="relative sm:hidden">
                                                <summary
                                                    class="list-none inline-flex items-center rounded border px-2 py-1 hover:bg-gray-50 cursor-pointer"
                                                    @click.stop>
                                                    <MoreVertical class="w-4 h-4" />
                                                </summary>

                                                <ul
                                                    class="absolute right-0 z-30 mt-1 w-40 rounded border bg-white shadow-md p-1">

                                                    <li>
                                                        <Button variant="ghost"
                                                            class="w-full justify-start text-left !py-6 rounded hover:bg-gray-100 text-sm border-none"
                                                            @click.stop="openEditChild(child, root); closeMenu($event)">
                                                            Editar
                                                        </Button>
                                                    </li>
                                                    <li>
                                                        <Button variant="danger"
                                                            class="w-full justify-start text-left px-3 py-2 rounded hover:bg-red-50 text-sm text-red-700"
                                                            @click.stop="onDelete(child); closeMenu($event)">
                                                            Eliminar
                                                        </Button>
                                                    </li>
                                                </ul>
                                            </details>
                                        </div>
                                    </div>
                                </template>
                            </Draggable>
                        </div>
                    </transition>
                </section>
            </template>
        </Draggable>

        <!-- Modal -->
        <CategoryModal v-model:open="showModal" :mode="modalMode" :parent="modalParent" :value="modalValue"
            @save="onSave" />
    </div>
</template>

<style scoped>
:deep(.sortable-chosen),
:deep(.sortable-drag) {
    cursor: grabbing !important;
}

/* Accordion transition */
.acc-enter-active,
.acc-leave-active {
    transition: max-height 220ms ease, opacity 180ms ease;
}

.acc-enter-from,
.acc-leave-to {
    max-height: 0;
    opacity: 0;
}

.acc-enter-to,
.acc-leave-from {
    max-height: 1000px;
    opacity: 1;
}

/* Hide default triangle of <details> on WebKit */
details>summary::-webkit-details-marker {
    display: none;
}

@media (prefers-reduced-motion: reduce) {

    .acc-enter-active,
    .acc-leave-active {
        transition: none;
    }
}
</style>
