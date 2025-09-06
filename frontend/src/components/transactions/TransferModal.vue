<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import Button from "@/components/ui/Button.vue";
import { useAccounts } from "@/services/accounts/accounts.store";
import { TransactionService } from "@/services/transactions/transactions.service";

type Props = {
    open: boolean;
    defaultFromAccountId?: number | null;
};
const props = defineProps<Props>();
const emit = defineEmits<{ (e: "update:open", v: boolean): void; (e: "created"): void }>();

const accStore = useAccounts();
const accounts = accStore.items;
const loaded = accStore.loaded;

const fromAccountId = ref<number | null>(props.defaultFromAccountId ?? null);
const toAccountId = ref<number | null>(null);
const amountEUR = ref<string>(""); // show in euros, convert on submit
const date = ref<string>(new Date().toISOString().slice(0, 10));
const description = ref<string>("Transferência");
const notes = ref<string>("");

const saving = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
    if (!loaded.value) await accStore.load();
    if (fromAccountId.value == null && accounts.value?.length) {
        fromAccountId.value = accounts.value[0].id;
    }
});

const otherAccounts = computed(() =>
    (accounts.value || []).filter(a => a.id !== fromAccountId.value)
);

watch(() => props.open, v => { if (!v) reset(); });

function reset() {
    toAccountId.value = null;
    amountEUR.value = "";
    date.value = new Date().toISOString().slice(0, 10);
    description.value = "Transferência";
    notes.value = "";
    error.value = null;
}

function toCents(s: string): number {
    const n = Number(String(s).replace(",", "."));
    if (!Number.isFinite(n)) return NaN;
    return Math.round(n * 100);
}

async function onSubmit() {
    if (fromAccountId.value == null || toAccountId.value == null) {
        error.value = "Selecione as contas origem e destino.";
        return;
    }
    const cents = toCents(amountEUR.value);
    if (!Number.isInteger(cents) || cents <= 0) {
        error.value = "Valor inválido.";
        return;
    }
    saving.value = true; error.value = null;
    try {
        await TransactionService.createTransfer({
            fromAccountId: fromAccountId.value,
            toAccountId: toAccountId.value,
            amount: cents,
            date: date.value,
            description: description.value || null,
            notes: notes.value || null,
        });
        emit("created");
        emit("update:open", false);
        reset();
    } catch (e: any) {
        error.value = e?.message || "Falha ao criar transferência.";
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-black/40">
        <div class="w-full max-w-md rounded bg-white shadow p-4">
            <h2 class="text-lg font-semibold mb-3">Nova transferência</h2>

            <div class="space-y-3">
                <div>
                    <label class="block text-sm text-gray-600 mb-1">Conta origem</label>
                    <select v-model="fromAccountId" class="w-full border rounded px-3 py-1">
                        <option v-for="a in (accounts || [])" :key="a.id" :value="a.id">{{ a.name }}</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm text-gray-600 mb-1">Conta destino</label>
                    <select v-model="toAccountId" class="w-full border rounded px-3 py-1">
                        <option :value="null" disabled>— selecione —</option>
                        <option v-for="a in otherAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm text-gray-600 mb-1">Valor (EUR)</label>
                    <input v-model="amountEUR" placeholder="0,00" class="w-full border rounded px-3 py-1" />
                </div>

                <div>
                    <label class="block text-sm text-gray-600 mb-1">Data</label>
                    <input v-model="date" type="date" class="w-full border rounded px-3 py-1" />
                </div>

                <div>
                    <label class="block text-sm text-gray-600 mb-1">Descrição</label>
                    <input v-model="description" class="w-full border rounded px-3 py-1" />
                </div>

                <div>
                    <label class="block text-sm text-gray-600 mb-1">Notas</label>
                    <textarea v-model="notes" rows="2" class="w-full border rounded px-3 py-1" />
                </div>

                <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

                <div class="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" @click="emit('update:open', false)">Cancelar</Button>
                    <Button :disabled="saving" variant="primary" @click="onSubmit">Criar</Button>
                </div>
            </div>
        </div>
    </div>
</template>
