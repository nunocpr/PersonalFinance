<!-- src/components/rules/RuleModal.vue -->
<script setup lang="ts">
import { reactive, computed, watch } from "vue";
import { useCategories } from "@/services/categories/categories.store";
import type { RuleKind, TxRule, CreateRuleDto } from "@/types/rules";
import BaseModal from "../ui/BaseModal.vue";

const props = defineProps<{
    open: boolean;
    mode: "create" | "edit";
    value?: TxRule | null;
}>();

const emit = defineEmits<{
    (e: "update:open", v: boolean): void;
    (e: "save", payload: CreateRuleDto | Partial<TxRule>): void;
}>();

const { roots, load } = useCategories();

// Build children-only select options
const childOpts = computed(() => {
    const list: { id: number; label: string }[] = [];
    for (const r of roots.value || []) {
        for (const c of (r.children || [])) list.push({ id: c.id, label: `${r.name} / ${c.name}` });
    }
    return list.sort((a, b) => a.label.localeCompare(b.label, "pt-PT"));
});

const form = reactive<CreateRuleDto & { testDesc: string }>({
    name: "",
    pattern: "",
    isRegex: false,
    caseSensitive: false,
    isActive: true,
    priority: 100,
    categoryId: null,
    kind: null,
    testDesc: "",
});

watch(() => props.open, (o) => {
    if (!o) return;
    // preload cats
    if (!roots.value?.length) load();
    // reset / fill
    if (props.mode === "edit" && props.value) {
        form.name = props.value.name;
        form.pattern = props.value.pattern;
        form.isRegex = !!props.value.isRegex;
        form.caseSensitive = !!props.value.caseSensitive;
        form.isActive = !!props.value.isActive;
        form.priority = props.value.priority ?? 100;
        form.categoryId = props.value.categoryId ?? null;
        form.kind = props.value.kind ?? null;
        form.testDesc = "";
    } else {
        form.name = "";
        form.pattern = "";
        form.isRegex = false;
        form.caseSensitive = false;
        form.isActive = true;
        form.priority = 100;
        form.categoryId = null;
        form.kind = null;
        form.testDesc = "";
    }
}, { immediate: true });

function close() { emit("update:open", false); }

function save() {
    // minimal validation
    if (!form.name.trim() || !form.pattern.trim()) return;
    const payload: CreateRuleDto = {
        name: form.name.trim(),
        pattern: form.pattern.trim(),
        isRegex: !!form.isRegex,
        caseSensitive: !!form.caseSensitive,
        isActive: !!form.isActive,
        priority: Number(form.priority ?? 100),
        categoryId: form.categoryId ?? null,
        kind: form.kind ?? null,
    };
    emit("save", payload);
    close();
}

// Simple local tester
const tester = computed(() => {
    try {
        const flags = form.caseSensitive ? "" : "i";
        const re = form.isRegex ? new RegExp(form.pattern, flags) : new RegExp(escapeRe(form.pattern), flags);
        const txt = form.testDesc ?? "";
        const ok = !!txt && re.test(txt);
        return { ok, error: "" };
    } catch (e: any) {
        return { ok: false, error: String(e?.message || "Regex inválida") };
    }
});

function escapeRe(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
</script>

<template>
    <BaseModal :open="open" @update:open="val => emit('update:open', val)" maxWidth="lg" labelledby="rule-modal-title">
        <template #header>
            <h2 id="rule-modal-title" class="text-lg font-heading">
                {{ mode === "create" ? "Adicionar regra" : "Editar regra" }}
            </h2>
        </template>

        <div class="grid gap-3">
            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Nome</div>
                <input v-model="form.name" class="w-full border rounded px-3 py-2" />
            </label>

            <div class="grid md:grid-cols-2 gap-3">
                <label class="block">
                    <div class="text-sm text-gray-600 mb-1">Padrão</div>
                    <input v-model="form.pattern" class="w-full border rounded px-3 py-2"
                        placeholder="ex.: CONTINENTE" />
                </label>
                <div class="flex items-center gap-4">
                    <label class="inline-flex items-center gap-2">
                        <input type="checkbox" v-model="form.isRegex" />
                        <span class="text-sm">Regex</span>
                    </label>
                    <label class="inline-flex items-center gap-2">
                        <input type="checkbox" v-model="form.caseSensitive" />
                        <span class="text-sm">Sensível a maiúsculas</span>
                    </label>
                    <label class="inline-flex items-center gap-2">
                        <input type="checkbox" v-model="form.isActive" />
                        <span class="text-sm">Ativa</span>
                    </label>
                </div>
            </div>

            <div class="grid md:grid-cols-2 gap-3">
                <label class="block">
                    <div class="text-sm text-gray-600 mb-1">Tipo</div>
                    <select v-model="form.kind" class="w-full border rounded px-3 py-2">
                        <option :value="null">— (deixar como está)</option>
                        <option value="DEBIT">Débito</option>
                        <option value="CREDIT">Crédito</option>
                    </select>
                </label>

                <label class="block">
                    <div class="text-sm text-gray-600 mb-1">Categoria (subcategoria)</div>
                    <select v-model.number="form.categoryId" class="w-full border rounded px-3 py-2">
                        <option :value="null">— Sem categoria —</option>
                        <option v-for="o in childOpts" :key="o.id" :value="o.id">{{ o.label }}</option>
                    </select>
                </label>
            </div>

            <label class="block">
                <div class="text-sm text-gray-600 mb-1">Prioridade</div>
                <input v-model.number="form.priority" type="number" min="0" class="w-full border rounded px-3 py-2" />
            </label>

            <!-- quick tester -->
            <div class="rounded border p-3">
                <div class="text-sm text-gray-600 mb-1">Testar descrição</div>
                <input v-model="form.testDesc" class="w-full border rounded px-3 py-2"
                    placeholder="cole aqui uma descrição…" />
                <p v-if="tester.error" class="text-red-600 text-sm mt-2">{{ tester.error }}</p>
                <p v-else class="text-sm mt-2" :class="tester.ok ? 'text-green-700' : 'text-gray-500'">
                    {{ tester.ok ? "✅ Faz match" : "— Sem match" }}
                </p>
            </div>
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