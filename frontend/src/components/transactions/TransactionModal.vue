<!-- src/components/transactions/TransactionModal.vue -->
<script setup lang="ts">
import { reactive, watch, computed, onMounted } from "vue";
import { useAccounts } from "@/services/accounts/accounts.store";
import { useCategories } from "@/services/categories/categories.store";
import type { Category } from "@/types/categories";
import MoneyCentsInput from "../inputs/MoneyCentsInput.vue";
import BaseModal from "../ui/BaseModal.vue";


type Mode = "create" | "edit";
const props = defineProps<{
    open: boolean; mode: Mode; value?: {
        id?: string;
        accountId?: number;
        date?: string;
        amount?: number;
        categoryId?: number;
        description?: string | null;
    } | null
}>();

const emit = defineEmits<{
    (e: "update:open", v: boolean): void;
    (e: "save", payload: {
        accountId: number;
        date: string;
        amount: number;
        categoryId: number | null;
        description: string;
    }): void;
}>();

const { activeId, items: accounts, load: loadAccounts } = useAccounts();
const { roots, load: loadCategories, loading: catLoading } = useCategories();

const childCategories = computed<{ id: number; label: string; parent: Category }[]>(() => {
    const out: any[] = [];
    for (const r of roots.value || []) {
        for (const c of (r.children || [])) out.push({ id: c.id, label: `${r.name} • ${c.name}`, parent: r });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, "pt-PT"));
});

const form = reactive({
    accountId: 0,
    date: new Date().toISOString().slice(0, 10),
    amountCents: 0,
    categoryId: null as number | null,
    description: "" as string
});

function reset() {
    form.accountId = activeId.value ?? (accounts.value[0]?.id ?? 0);
    form.date = new Date().toISOString().slice(0, 10);
    form.amountCents = 0;
    form.categoryId = null;
    form.description = "";
}

watch(() => props.open, (o) => {
    if (!o) return;
    if (!accounts.value.length) loadAccounts();
    if (!roots.value.length) loadCategories();

    if (props.mode === "edit" && props.value) {
        form.accountId = props.value.accountId ?? (activeId.value ?? 0);
        form.date = (props.value.date ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
        form.amountCents = Number(props.value.amount ?? 0);
        form.categoryId = props.value.categoryId ?? null;
        form.description = (props.value.description ?? "") || "";
    } else {
        reset();
    }
}, { immediate: true });

onMounted(() => {
    if (!accounts.value.length) loadAccounts();
    if (!roots.value.length) loadCategories();
});

function close() { emit("update:open", false); }

function save() {
    if (!form.accountId || !form.date) return;
    if (!Number.isFinite(form.amountCents) || form.amountCents === 0) return;

    emit("save", {
        accountId: form.accountId,
        date: form.date,
        amount: form.amountCents,
        categoryId: form.categoryId,
        description: form.description || ""
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

        <div class="space-y-3">
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
                <div class="text-sm text-gray-600 mb-1">Valor</div>
                <MoneyCentsInput v-model="form.amountCents" />
            </label>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Categoria <span
                        class="text-xs text-gray-500">(subcategorias)</span>
                </div>
                <select v-model.number="form.categoryId" class="w-full border rounded px-3 py-2">
                    <option :value="null">— Sem categoria —</option>
                    <option v-for="opt in childCategories" :key="opt.id" :value="opt.id">{{ opt.label }}
                    </option>
                </select>
                <div v-if="catLoading" class="text-xs text-gray-500 mt-1">A carregar categorias…</div>
            </label>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Descrição <span class="text-xs text-gray-500">(opcional)</span>
                </div>
                <input v-model="form.description" class="w-full border rounded px-3 py-2" />
            </label>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <button type="button" class="px-3 py-1.5 rounded border cursor-pointer" @click="close">Cancelar</button>
                <button type="button" class="px-3 py-1.5 rounded bg-black text-white cursor-pointer"
                    @click="save">Guardar</button>
            </div>
        </template>
    </BaseModal>
</template>
