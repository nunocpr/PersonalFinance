<!-- src/components/accounts/AccountModal.vue -->
<script setup lang="ts">
import { reactive, watch } from "vue";
import MoneyCentsInput from "@/components/inputs/MoneyCentsInput.vue";
import type { Account } from "@/types/accounts";

const props = defineProps<{
    open: boolean;
    mode: "create" | "edit";
    value?: Account | null;
}>();

const emit = defineEmits<{
    (e: "update:open", v: boolean): void;
    (e: "save", payload: {
        name: string;
        type: string;            // same as before ("checking" etc.)
        balance: number;         // <-- integer cents
        description: string | null;
    }): void;
}>();

const form = reactive({
    name: "",
    type: "checking",
    balanceCents: 0,            // <-- integer cents here
    description: "" as string | null,
});

watch(
    () => props.value,
    v => {
        if (props.mode === "edit" && v) {
            form.name = v.name;
            form.type = v.type;
            form.balanceCents = v.balance;       // <-- backend should return cents
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
        balance: form.balanceCents,           // <-- send cents
        description: form.description?.trim() || null,
    });
}
</script>

<template>
    <teleport to="body">
        <div v-if="open" class="fixed inset-0 z-[9999] grid place-items-center bg-black/40" @click.self="close">
            <div class="bg-white rounded-xl w-full max-w-md p-5 space-y-4 shadow-xl">
                <h2 class="text-lg font-heading">{{ mode === "create" ? "Adicionar conta" : "Editar conta" }}</h2>

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
                        <!-- The masked cents input -->
                        <MoneyCentsInput v-model="form.balanceCents" aria-label="Saldo em euros" />
                    </label>

                    <label class="block">
                        <div class="text-sm text-gray-600 mb-1">Descrição</div>
                        <input v-model="form.description" class="w-full border rounded px-3 py-2" />
                    </label>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" class="px-3 py-1.5 rounded border cursor-pointer"
                        @click="close">Cancelar</button>
                    <button type="button" class="px-3 py-1.5 rounded bg-black text-white cursor-pointer"
                        @click="submit">Guardar</button>
                </div>
            </div>
        </div>
    </teleport>
</template>
