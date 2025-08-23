<!-- src/components/categories/CategoryModal.vue -->
<script setup lang="ts">
import { reactive, computed, watch } from "vue";
import type { Category, CategoryKind } from "@/types/categories";
import BaseModal from "../ui/BaseModal.vue";
import Button from "../ui/Button.vue";

const props = defineProps<{
    open: boolean;
    mode: "create" | "edit";
    /** parent present => subcategory context (inherits tipo/cor) */
    parent?: Category | null;
    /** existing category when editing */
    value?: Category | null;
}>();

const emit = defineEmits<{
    (e: "update:open", v: boolean): void;
    (e: "save", payload: {
        name: string;
        description: string | null;
        /** only used/visible for root categories */
        color?: string | null;
        type?: CategoryKind;
    }): void;
}>();

// form model
const form = reactive({
    name: "",
    description: "",
    color: "#4f46e5",
    type: "expense" as CategoryKind,
});

const isChild = computed(() => !!props.parent);

// Reset form whenever the modal opens or the target changes
watch(
    () => [props.open, props.mode, props.parent, props.value] as const,
    () => {
        if (!props.open) return;

        if (props.mode === "edit" && props.value) {
            // editing root or child
            form.name = props.value.name ?? "";
            form.description = props.value.description ?? "";
            // only meaningful for root
            form.color = props.value.color ?? (props.parent?.color ?? "#4f46e5");
            form.type = (props.value as any).type ?? "expense";
        } else {
            // creating new
            form.name = "";
            form.description = "";
            form.color = props.parent?.color ?? "#4f46e5";
            // when creating child, inherit parent's tipo; for root default to "expense"
            form.type = (props.parent?.type as CategoryKind) ?? "expense";
        }
    },
    { immediate: true }
);

function close() { emit("update:open", false); }

function save() {
    emit("save", {
        name: form.name.trim(),
        description: form.description?.trim() || null,
        // only send color/type when it's a ROOT (i.e., no parent)
        color: isChild.value ? undefined : (form.color || null),
        type: isChild.value ? undefined : form.type,
    });
    close();
}
</script>

<template>
    <BaseModal :open="open" @update:open="val => emit('update:open', val)" maxWidth="md" labelledby="cat-modal-title">
        <template #header>
            <h2 id="cat-modal-title" class="text-lg font-heading">
                {{
                    mode === "create"
                        ? (isChild ? `Adicionar subcategoria em "${parent?.name}"` : "Adicionar categoria")
                        : (isChild ? `Editar subcategoria` : "Editar categoria")
                }}
            </h2>
        </template>

        <!-- body (unchanged) -->
        <div class="space-y-3">
            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Nome</div>
                <input v-model="form.name" class="w-full border rounded px-3 py-2" />
            </label>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Descrição</div>
                <input v-model="form.description" class="w-full border rounded px-3 py-2" />
            </label>

            <!-- Only for ROOT categories -->
            <div v-if="!isChild" class="grid grid-cols-2 gap-3">
                <label class="block">
                    <div class="text-sm text-gray-600 mb-1">Tipo</div>
                    <select v-model="form.type" class="w-full border rounded px-3 py-2">
                        <option value="expense">Despesa</option>
                        <option value="income">Receita</option>
                        <option value="transfer">Transferência</option>
                    </select>
                </label>

                <label class="block">
                    <div class="text-sm text-gray-600 mb-1">Cor</div>
                    <input type="color" v-model="form.color" class="w-full h-10 border rounded" />
                </label>
            </div>

            <!-- Helper note for children -->
            <p v-else class="text-xs text-gray-500">
                A subcategoria herda o <strong>tipo</strong> e a <strong>cor</strong> da categoria
                principal.
            </p>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button variant="ghost" size="sm" title="Editar Conta" @click="close">Cancelar</Button>
                <Button variant="ghost" size="sm" title="Editar Conta" @click="save">Guardar</Button>
            </div>
        </template>
    </BaseModal>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity .2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
