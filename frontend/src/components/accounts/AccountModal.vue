<!-- src/components/accounts/AccountModal.vue -->
<script setup lang="ts">
import { reactive, watch } from "vue";
import MoneyCentsInput from "@/components/inputs/MoneyCentsInput.vue";
import type { Account } from "@/types/accounts";
import BaseModal from "../ui/BaseModal.vue";
import Button from "../ui/Button.vue";

const props = defineProps<{
    open: boolean;
    mode: "create" | "edit";
    value?: Account | null;
}>();

const emit = defineEmits<{
    (e: "update:open", v: boolean): void;
    (e: "save", payload: {
        name: string;
        type: string;
        openingBalance: number;
        openingDate: string | null;
        description: string | null;
    }): void;
}>();

const form = reactive({
    name: "",
    type: "checking",
    balanceCents: 0,
    openingDate: null as string | null,
    description: "" as string | null,
});

watch(
    () => props.value,
    v => {
        if (props.mode === "edit" && v) {
            form.name = v.name;
            form.type = v.type;
            form.balanceCents = v.openingBalance;
            form.openingDate = v.openingDate;
            form.description = v.description ?? "";
        } else if (props.mode === "create") {
            form.name = "";
            form.type = "checking";
            form.balanceCents = 0;
            form.description = "";
        }
    },
    { immediate: true }
);

function close() { emit("update:open", false); }

function submit() {
    emit("save", {
        name: form.name.trim(),
        type: form.type,
        openingBalance: form.balanceCents,
        openingDate: form.openingDate,
        description: form.description?.trim() || null,
    });
}
</script>

<template>
    <BaseModal :open="open" @update:open="val => emit('update:open', val)" maxWidth="md" labelledby="acct-modal-title">
        <template #header>
            <h2 id="acct-modal-title" class="text-lg font-heading">
                {{ mode === "create" ? "Adicionar conta" : "Editar conta" }}
            </h2>
        </template>

        <div class="space-y-3">
            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Nome</div>
                <input v-model="form.name" class="w-full border rounded px-3 py-2" />
            </label>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Tipo</div>
                <select v-model="form.type" class="w-full border rounded px-3 py-2">
                    <option value="checking">Conta à ordem</option>
                    <option value="savings">Poupança</option>
                    <option value="credit">Crédito</option>
                    <option value="investment">Investimento</option>
                    <option value="other">Outra</option>
                </select>
            </label>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Saldo inicial</div>
                <MoneyCentsInput v-model="form.balanceCents" aria-label="Saldo em euros" />
            </label>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Data de Criação</div>
                <input v-model="form.openingDate" type="date" class="w-full border rounded px-3 py-2" />
            </label>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Descrição</div>
                <input v-model="form.description" class="w-full border rounded px-3 py-2" />
            </label>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button variant="ghost" size="sm" title="Editar Conta" @click="close">Cancelar</Button>
                <Button variant="primary" size="sm" title="Editar Conta" @click="submit">Guardar</Button>
            </div>
        </template>
    </BaseModal>
</template>