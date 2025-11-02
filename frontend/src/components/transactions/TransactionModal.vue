<!-- src/components/transactions/TransactionModal.vue -->
<script setup lang="ts">
import { reactive, watch, computed, onMounted, ref } from "vue";
import { useAccounts } from "@/services/accounts/accounts.store";
import { useCategories } from "@/services/categories/categories.store";
import type { Category } from "@/types/categories";
import MoneyCentsInput from "../inputs/MoneyCentsInput.vue";
import BaseModal from "../ui/BaseModal.vue";
import { TransactionService } from "@/services/transactions/transactions.service";
import { EnumTransactionKind } from "@/types/transactions";

type Mode = "create" | "edit";
const props = defineProps<{
    open: boolean;
    mode: Mode;
    value?: {
        id?: string;
        accountId?: number;
        kind: EnumTransactionKind.CREDIT | EnumTransactionKind.DEBIT;
        date?: string;
        amount?: number;             // integer cents
        categoryId?: number | null;
        description?: string | null;
        notes?: string | null;
    } | null;
}>();

const emit = defineEmits<{
    (e: "update:open", v: boolean): void;
    (e: "save", payload: {
        accountId: number;
        date: string;
        kind: EnumTransactionKind.CREDIT | EnumTransactionKind.DEBIT;
        amount: number;              // integer cents
        categoryId: number | null;
        description: string | null;
        notes?: string | null;
    }): void;

    // NEW: when the modal performs transfer actions itself
    (e: "created-transfer"): void;
    (e: "converted-transfer"): void;
}>();

/* Accounts & Categories */
const { activeId, items: accounts, load: loadAccounts } = useAccounts();
const { roots, load: loadCategories, loading: catLoading } = useCategories();

/* Build flat list of child categories */
const childCategories = computed<{ id: number; label: string; parent: Category }[]>(() => {
    const out: any[] = [];
    for (const r of roots.value || []) {
        for (const c of (r.children || [])) out.push({ id: c.id, label: `${r.name} • ${c.name}`, parent: r });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, "pt-PT"));
});

/* Form state */
const form = reactive({
    accountId: 0,
    date: new Date().toISOString().slice(0, 10),
    kind: EnumTransactionKind.DEBIT,
    amountCents: 0,
    categoryId: null as number | null,
    description: "" as string,
    notes: "" as string,
});

/* Properly map category select ('' ⇄ null, "123" ⇄ 123) */
const categoryModel = computed<string>({
    get() { return form.categoryId == null ? "" : String(form.categoryId); },
    set(v: string) { form.categoryId = v === "" ? null : Number(v); },
});

/* TRANSFER UI */
const isTransfer = ref(false);
const toAccountId = ref<number | null>(null);

const otherAccounts = computed(() =>
    (accounts.value || []).filter(a => a.id !== form.accountId)
);

function reset() {
    form.accountId = activeId.value ?? (accounts.value[0]?.id ?? 0);
    form.date = new Date().toISOString().slice(0, 10);
    form.kind = EnumTransactionKind.DEBIT;
    form.amountCents = 0;
    form.categoryId = null;
    form.description = "";
    form.notes = "";
    isTransfer.value = false;
    toAccountId.value = null;
}

/* Open → prefill (and lazy-load lists) */
watch(
    () => props.open,
    (o) => {
        if (!o) return;
        if (!accounts.value.length) loadAccounts();
        if (!roots.value.length) loadCategories();

        if (props.mode === "edit" && props.value) {
            form.accountId = props.value.accountId ?? (activeId.value ?? 0);
            form.date = (props.value.date ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
            form.kind = props.value.kind;
            form.amountCents = Number(props.value.amount ?? 0);
            form.categoryId = props.value.categoryId ?? null;
            form.description = (props.value.description ?? "") || "";
            form.notes = (props.value.notes ?? "") || "";
            isTransfer.value = false;
            toAccountId.value = null;
        } else {
            reset();
        }
    },
    { immediate: true }
);

onMounted(() => {
    if (!accounts.value.length) loadAccounts();
    if (!roots.value.length) loadCategories();
});

function close() {
    emit("update:open", false);
}

async function save() {
    // Basic guardrails
    if (!form.accountId || !form.date) return;
    if (!Number.isFinite(form.amountCents) || form.amountCents === 0) return;

    // If user marked as transfer, we handle it here using the service.
    if (isTransfer.value) {
        if (!toAccountId.value) return; // must select destination

        const abs = Math.abs(form.amountCents);

        if (props.mode === "create") {
            await TransactionService.createTransfer({
                fromAccountId: form.accountId,
                toAccountId: toAccountId.value,
                amount: abs,
                date: form.date,
                description: form.description.trim() ? form.description.trim() : null,
                notes: form.notes.trim() ? form.notes.trim() : null,
            });
            emit("created-transfer");
            close();
            reset();
            return;
        }

        if (props.mode === "edit" && props.value?.id) {
            await TransactionService.convertToTransfer({
                txId: props.value.id,
                toAccountId: toAccountId.value,
                amount: abs,
                date: form.date,
                description: form.description.trim() ? form.description.trim() : null,
                notes: form.notes.trim() ? form.notes.trim() : null,
            });
            emit("converted-transfer");
            close();
            reset();
            return;
        }
    }

    // Normal non-transfer save: let parent perform add/update
    emit("save", {
        accountId: form.accountId,
        date: form.date,
        kind: form.kind,
        amount: form.amountCents, // integer cents
        categoryId: form.categoryId,
        description: form.description.trim() ? form.description.trim() : null,
        notes: form.notes.trim() ? form.notes.trim() : null,
    });

    close();
    reset();
}
</script>

<template>
    <BaseModal :open="open" @update:open="val => emit('update:open', val)" maxWidth="md" labelledby="tx-modal-title">
        <template #header>
            <h2 id="tx-modal-title" class="text-lg font-heading">
                {{ mode === "create" ? "Adicionar transação" : "Editar transação" }}
            </h2>
        </template>

        <!-- Use a form so Enter submits -->
        <form class="space-y-3" @submit.prevent="save">
            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Conta</div>
                <select v-model.number="form.accountId" class="w-full border rounded px-3 py-2">
                    <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
                </select>
            </label>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Data</div>
                <input v-model="form.date" type="date" class="w-full border rounded px-3 py-2" />
            </label>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Tipo de Transação</div>
                <select v-model="form.kind" class="w-full border rounded px-3 py-2">
                    <option value="DEBIT">Débito</option>
                    <option value="CREDIT">Crédito</option>
                </select>
            </label>


            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Valor</div>
                <MoneyCentsInput v-model="form.amountCents" />
            </label>

            <!-- Transfer toggle + destination account -->
            <div class="mt-2 rounded border p-2 bg-gray-50">
                <label class="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" v-model="isTransfer" />
                    <span>Esta transação é uma <strong>transferência</strong></span>
                </label>

                <div v-if="isTransfer" class="mt-2">
                    <label class="block">
                        <div class="text-sm text-gray-600 mb-1">Conta destino</div>
                        <select v-model="toAccountId" class="w-full border rounded px-3 py-2">
                            <option :value="null" disabled>— selecione —</option>
                            <option v-for="a in otherAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
                        </select>
                    </label>
                    <p class="text-xs text-gray-500 mt-1">
                        Ao guardar, será criada automaticamente a perna na conta destino (ou esta transação será
                        convertida).
                    </p>
                </div>
            </div>

            <!-- Category disabled when transfer -->
            <label class="block">
                <div class="text-sm text-gray-600 mb-1">
                    Categoria <span class="text-xs text-gray-500">(subcategorias)</span>
                </div>
                <select v-model="categoryModel" class="w-full border rounded px-3 py-2" :disabled="isTransfer">
                    <option value="">— Sem categoria —</option>
                    <option v-for="opt in childCategories" :key="opt.id" :value="String(opt.id)">
                        {{ opt.label }}
                    </option>
                </select>
                <div v-if="catLoading" class="text-xs text-gray-500 mt-1">A carregar categorias…</div>
            </label>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">
                    Descrição <span class="text-xs text-gray-500">(opcional)</span>
                </div>
                <input v-model="form.description" class="w-full border rounded px-3 py-2" />
            </label>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">
                    Notas <span class="text-xs text-gray-500">(opcional)</span>
                </div>
                <textarea v-model="form.notes" rows="3" class="w-full border rounded px-3 py-2"></textarea>
            </label>

            <div class="flex justify-end gap-2 pt-2">
                <button type="button" class="px-3 py-1.5 rounded border cursor-pointer" @click="close">
                    Cancelar
                </button>
                <button type="submit" class="px-3 py-1.5 rounded bg-black text-white cursor-pointer">
                    Guardar
                </button>
            </div>
        </form>
    </BaseModal>
</template>
