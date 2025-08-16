<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAccounts } from "@/services/accounts/accounts.store";
import AccountModal from "./AccountModal.vue";
import type { Account } from "@/types/accounts";
import { formatCentsEUR } from "@/utils/money";

const { items, load, add, edit, remove, getAccountTypeLabelPt } = useAccounts();

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
</script>

<template>
    <section class="space-y-4">

        <div class="grid gap-6 mt-12">
            <div v-for="a in items" :key="a.id"
                class="rounded border shadow-md p-6 px-12 flex items-center justify-between">
                <div>
                    <div class="font-bold text-lg flex items-center">
                        {{ a.name }}
                        <span class="mx-2">|</span>
                        <span class="text-gray-500 font-normal text-sm">{{
                            getAccountTypeLabelPt(a.type)
                        }}
                            <span v-if="a.description">• {{ a.description }}</span>
                        </span>
                    </div>
                    <div class="text-2xl text-gray-700 mt-3">
                        {{ formatCentsEUR(a.balance) }}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button type="button" class="cursor-pointer px-2 py-1 rounded border"
                        @click="openEdit(a)">Editar</button>
                    <button type="button" class="cursor-pointer px-2 py-1 rounded bg-red-600 text-white"
                        @click="onDelete(a)">Apagar</button>
                </div>
            </div>
            <div class="flex flex-col items-center gap-y-6 mt-12">
                <p v-if="!items.length" class="text-sm text-gray-600">Ainda não tens contas. Cria a tua primeira conta.
                </p>
                <button type="button" class="cursor-pointer px-3 py-1.5 rounded bg-black text-white"
                    @click="openCreate">
                    Adicionar nova conta
                </button>
            </div>
        </div>

        <AccountModal v-model:open="show" :mode="mode" :value="current" @save="onSave" />
    </section>
</template>
