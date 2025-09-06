<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import Button from "@/components/ui/Button.vue";
import { useAccounts } from "@/services/accounts/accounts.store";
import { formatCentsEUR } from "@/utils/money";
import { TransactionService } from "@/services/transactions/transactions.service";

type Tx = {
    id: string;
    accountId: number;
    amount: number;
    date: string;
    description: string | null;
    notes?: string | null;
};

const props = defineProps<{
    open: boolean;
    tx: Tx | null;
}>();
const emit = defineEmits<{ (e: "update:open", v: boolean): void; (e: "converted"): void }>();

const accStore = useAccounts();
const accounts = accStore.items;
const loaded = accStore.loaded;

const toAccountId = ref<number | null>(null);
const date = ref<string>("");
const description = ref<string>("");
const notes = ref<string>("");
const amountEUR = ref<string>("");

const saving = ref(false);
const error = ref<string | null>(null);

onMounted(async () => { if (!loaded.value) await accStore.load(); });

watch(() => props.open, (v) => {
    if (v && props.tx) {
        // init fields from tx
        const others = (accounts.value || []).filter(a => a.id !== props.tx!.accountId);
        toAccountId.value = others[0]?.id ?? null;
        date.value = (props.tx.date || new Date().toISOString()).slice(0, 10);
        description.value = props.tx.description || "Transferência";
        notes.value = props.tx.notes || "";
        amountEUR.value = (Math.abs(props.tx.amount) / 100).toFixed(2);
        error.value = null;
    }
});

const otherAccounts = computed(() =>
    (accounts.value || []).filter(a => a.id !== (props.tx?.accountId ?? -1))
);

function toCents(s: string): number {
    const n = Number(String(s).replace(",", "."));
    if (!Number.isFinite(n)) return NaN;
    return Math.round(n * 100);
}

async function onSubmit() {
    if (!props.tx) return;
    if (toAccountId.value == null) { error.value = "Selecione a conta destino."; return; }
    const cents = toCents(amountEUR.value);
    if (!Number.isInteger(cents) || cents <= 0) { error.value = "Valor inválido."; return; }

    saving.value = true; error.value = null;
    try {
        await TransactionService.convertToTransfer({
            txId: props.tx.id,
            toAccountId: toAccountId.value,
            amount: cents,
            date: date.value,
            description: description.value || null,
            notes: notes.value || null,
        });
        emit("converted");
        emit("update:open", false);
    } catch (e: any) {
        error.value = e?.message || "Falha ao converter para transferência.";
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div v-if="open && tx" class="fixed inset-0 z-50 grid place-items-center bg-black/40">
        <div class="w-full max-w-md rounded bg-white shadow p-4">
            <h2 class="text-lg font-semibold mb-3">Converter em transferência</h2>

            <div class="rounded border p-3 text-sm bg-gray-50 mb-3">
                <div><strong>Atual:</strong></div>
                <div>Data: {{ tx.date?.slice(0, 10) }}</div>
                <div>Valor: <span :class="tx.amount < 0 ? 'text-red-600' : 'text-green-700'">{{
                    formatCentsEUR(tx.amount) }}</span></div>
                <div>Conta: {{(accounts || []).find(a => a.id === tx?.accountId)?.name || `#${tx.accountId}`}}</div>
                <div>Descrição: {{ tx.description || "—" }}</div>
            </div>

            <div class="space-y-3">
                <div>
                    <label class="block text-sm text-gray-600 mb-1">Conta destino</label>
                    <select v-model="toAccountId" class="w-full border rounded px-3 py-1">
                        <option :value="null" disabled>— selecione —</option>
                        <option v-for="a in otherAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm text-gray-600 mb-1">Valor (EUR)</label>
                    <input v-model="amountEUR" class="w-full border rounded px-3 py-1" />
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
                    <Button :disabled="saving" variant="primary" @click="onSubmit">Converter</Button>
                </div>
            </div>
        </div>
    </div>
</template>
