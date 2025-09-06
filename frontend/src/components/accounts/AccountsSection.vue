<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAccounts } from "@/services/accounts/accounts.store";
import AccountModal from "./AccountModal.vue";
import type { Account } from "@/types/accounts";
import { formatCentsEUR } from "@/utils/money";
import Button from "../ui/Button.vue";

const { items, load, add, edit, remove, getAccountTypeLabelPt, currentBalanceById } = useAccounts();

const show = ref(false);
const mode = ref<"create" | "edit">("create");
const current = ref<Account | null>(null);

onMounted(() => { load(); });

function openCreate() {
    mode.value = "create";
    current.value = null;
    show.value = true;
}

function openEdit(a: Account) {
    mode.value = "edit";
    current.value = a;
    show.value = true;
}

async function onSave(payload: any) {
    if (mode.value === "create") await add(payload);
    else if (current.value) await edit(current.value.id, payload);
    show.value = false;
}

async function onDelete(a: Account) {
    if (confirm(`Apagar a conta "${a.name}"? Esta ação não pode ser anulada.`)) {
        await remove(a.id);
    }
}

/* Current Balance */



</script>

<template>
    <section class="space-y-4">
        <div class="flex flex-col items-start gap-y-4">
            <p v-if="!items.length" class="text-sm text-gray-600">Ainda não tens contas. Cria a tua primeira conta.
            </p>
            <Button variant="primary" size="md" title="Criar Conta" @click="openCreate">Adicionar nova
                conta</Button>

        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 md:mt-12">
            <!-- Cards -->
            <div v-for="a in items" :key="a.id"
                class="rounded border shadow-md p-6 px-8 flex flex-col items-start justify-between hover:bg-primary/10 transition-colors">
                <!-- TOP -->
                <div class="flex flex-col w-full flex-1">
                    <span class="font-bold text-lg flex items-baseline border-b pb-2">
                        {{ a.name }}
                        <span class="text-gray-500 font-normal text-sm ml-1">• {{ getAccountTypeLabelPt(a.type)
                        }}</span>
                    </span>

                    <span v-if="a.description" class="text-gray-500 text-sm mt-3">{{ a.description }}</span>
                    <span v-if="a.openingDate" class="text-gray-500 text-sm">Criada em: {{
                        new Date(a.openingDate).toLocaleDateString('pt-PT') }}</span>

                    <!-- Initial amount pinned to bottom of the top block -->
                    <label class="pt-4 text-sm text-gray-500">Saldo Inicial</label>
                    <div class="text-2xl text-gray-700 mt-auto pb-4">
                        {{ formatCentsEUR(a.openingBalance) }}
                    </div>

                    <!-- Computed amount pinned to bottom of the top block -->
                    <label class="pt-4 text-sm text-gray-500">Saldo Atual</label>
                    <div class="text-2xl text-gray-700 mt-auto pb-4">
                        {{ formatCentsEUR(currentBalanceById.get(a.id) || 0) }}
                    </div>
                </div>
                <!-- BUTTONS -->
                <div class="flex gap-2">
                    <Button variant="ghost" size="sm" title="Editar Conta" @click="openEdit(a)">Editar</Button>
                    <Button variant="danger" size="sm" title="Apagar Conta" @click="onDelete(a)">Apagar</Button>
                </div>
            </div>
        </div>

        <AccountModal v-model:open="show" :mode="mode" :value="current" @save="onSave" />
    </section>
</template>
