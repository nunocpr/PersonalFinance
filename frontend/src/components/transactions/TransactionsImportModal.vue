<!-- src/components/transactions/TransactionsImportModal.vue -->
<script setup lang="ts">
import { ref, computed, watch } from "vue";
import BaseModal from "@/components/ui/BaseModal.vue";
import Button from "@/components/ui/Button.vue";
import { useAccounts } from "@/services/accounts/accounts.store";
import { useTransactions } from "@/services/transactions/transactions.store";
import { useCategories } from "@/services/categories/categories.store";
import CategoryPickerModal from "@/components/transactions/CategoryPickerModal.vue";
import { parseMillenniumCsvFromFile, type RawCsvRow } from "@/utils/csv/papaMillennium";
import { formatCentsEUR } from "@/utils/money";

type Rule = {
    id: number; name: string; pattern: string; isRegex: boolean; caseSensitive: boolean;
    priority: number; isActive: boolean; categoryId?: number | null; kind?: "DEBIT" | "CREDIT" | null;
};
type Draft = {
    date: string; description: string; cents: number; kind: "DEBIT" | "CREDIT"; categoryId: number | null; ruleId?: number;
};

const RuleAPI = {
    async list(): Promise<Rule[]> {
        try {
            const { default: client } = await import("@/services/api/client");
            const { data } = await client.get<Rule[]>("/transaction-rules");
            return Array.isArray(data) ? data : [];
        } catch { return []; }
    },
};

defineOptions({ name: "TransactionsImportModal" });

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "update:open", v: boolean): void }>();

const { items: accounts, activeId } = useAccounts();
const tx = useTransactions();
const { roots, load: loadCats } = useCategories();

// modal-local state
const parsing = ref(false);
const importing = ref(false);
const errorMsg = ref("");
const fileName = ref("");
const accountId = ref<number | null>(null);
const rules = ref<Rule[]>([]);
const drafts = ref<Draft[]>([]);
const skipDuplicates = ref(true);

// when opening: preload data
watch(() => props.open, async (o) => {
    if (!o) return;
    if (!accountId.value) accountId.value = activeId.value ?? null;
    if (!roots.value.length) await loadCats();
    if (!rules.value.length) rules.value = await RuleAPI.list();
}, { immediate: true });

function close() {
    emit("update:open", false);
    // optional: keep drafts; but usually nicer to reset on close:
    reset();
}

function norm(s: string, cs = false) {
    let t = String(s ?? "")
        .replace(/^\uFEFF/, "")
        .replace(/\u00A0/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[ \t]+/g, " ")
        .trim();
    return cs ? t : t.toLowerCase();
}
function applyRules(desc: string): { categoryId: number | null; kind: "DEBIT" | "CREDIT" | null; ruleId?: number } {
    if (!rules.value.length) return { categoryId: null, kind: null };
    const hayLo = norm(desc, false);
    const hayCs = norm(desc, true);
    const sorted = [...rules.value].filter(r => r.isActive).sort((a, b) => a.priority - b.priority);
    for (const r of sorted) {
        let matched = false;
        if (r.isRegex) {
            try {
                const re = new RegExp(r.pattern, r.caseSensitive ? "" : "i");
                matched = re.test(desc) || re.test(hayLo);
            } catch { matched = false; }
        } else {
            const needle = norm(r.pattern, r.caseSensitive);
            if (!needle) continue;
            matched = r.caseSensitive ? hayCs.includes(needle) : hayLo.includes(needle);
        }
        if (matched) return { categoryId: r.categoryId ?? null, kind: r.kind ?? null, ruleId: r.id };
    }
    return { categoryId: null, kind: null };
}

// child helpers
const childLabelById = computed(() => {
    const m = new Map<number, string>();
    for (const r of roots.value) for (const c of r.children ?? []) m.set(c.id, `${r.name} / ${c.name}`);
    return m;
});
const childColorById = computed(() => {
    const m = new Map<number, string | null>();
    for (const r of roots.value) {
        const p = r.color ?? null;
        for (const c of r.children ?? []) m.set(c.id, c.color ?? p ?? null);
    }
    return m;
});

// parse CSV
async function parseFile(file: File) {
    parsing.value = true; errorMsg.value = "";
    try {
        fileName.value = file.name;
        const rows: RawCsvRow[] = await parseMillenniumCsvFromFile(file);
        drafts.value = rows.map((r): Draft => {
            const defaultKind: "DEBIT" | "CREDIT" = r.cents < 0 ? "DEBIT" : "CREDIT";
            const hit = applyRules(r.description);
            let cents = r.cents; let kind = defaultKind;
            if (hit.kind === "DEBIT" && cents > 0) { cents = -Math.abs(cents); kind = "DEBIT"; }
            else if (hit.kind === "CREDIT" && cents < 0) { cents = Math.abs(cents); kind = "CREDIT"; }
            return { date: r.date, description: r.description, cents, kind, categoryId: hit.categoryId ?? null, ruleId: hit.ruleId };
        });
        if (!drafts.value.length) errorMsg.value = "Não foram encontradas linhas válidas no CSV.";
    } catch (e: any) {
        errorMsg.value = e?.message ?? "Falha ao processar CSV.";
        drafts.value = [];
    } finally { parsing.value = false; }
}

function reset() {
    drafts.value = []; errorMsg.value = ""; fileName.value = "";
}

// drag & drop + picker
async function onPickFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) await parseFile(f);
    input.value = "";
}
function onDragOver(e: DragEvent) { e.preventDefault(); }
async function onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) await parseFile(f);
}

const existingSig = computed(() => {
    const set = new Set<string>();
    for (const t of tx.items.value || []) {
        const sig = `${(t.date || "").slice(0, 10)}|${t.amount}|${(t.description || "").trim().toLowerCase()}`;
        set.add(sig);
    }
    return set;
});
const visibleDrafts = computed<Draft[]>(() => {
    if (!skipDuplicates.value) return drafts.value;
    return drafts.value.filter((d) => {
        const sig = `${d.date}|${d.cents}|${d.description.trim().toLowerCase()}`;
        return !existingSig.value.has(sig);
    });
});
const totalCents = computed<number>(() => visibleDrafts.value.reduce((s: number, d: Draft) => s + d.cents, 0));
const credits = computed<Draft[]>(() => visibleDrafts.value.filter(d => d.cents > 0));
const debits = computed<Draft[]>(() => visibleDrafts.value.filter(d => d.cents < 0));
const canImport = computed(
    () => (accountId.value ?? null) !== null && visibleDrafts.value.length > 0 && !parsing.value && !importing.value
);

function toggleKind(d: Draft) {
    if (d.kind === "DEBIT") { d.kind = "CREDIT"; d.cents = Math.abs(d.cents); }
    else { d.kind = "DEBIT"; d.cents = -Math.abs(d.cents); }
}

// category picker
const showPicker = ref(false);
const pickingIndex = ref<number | null>(null);
function openPicker(idx: number) { pickingIndex.value = idx; showPicker.value = true; }
function onPickCategory(payload: { categoryId: number }) {
    if (pickingIndex.value == null) return;
    visibleDrafts.value[pickingIndex.value].categoryId = payload.categoryId;
    showPicker.value = false;
}

// import
async function importAll() {
    if (!canImport.value) return;
    importing.value = true;
    try {
        const payloads = visibleDrafts.value.map((d) => ({
            accountId: accountId.value!, date: d.date, amount: d.cents, description: d.description, categoryId: d.categoryId ?? null,
        }));
        await tx.bulkAdd(payloads);
        reset();
        emit("update:open", false);
        await tx.load({ accountId: activeId.value || undefined });
    } finally { importing.value = false; }
}
</script>

<template>
    <BaseModal :open="open" @update:open="v => (v ? null : close())" maxWidth="6xl" labelledby="import-title">
        <template #header>
            <div class="flex items-center justify-between gap-3">
                <h2 id="import-title" class="text-lg font-heading">Importar transações</h2>
                <div class="min-w-[12rem]">
                    <label class="block text-sm text-gray-600 mb-1">Conta</label>
                    <select v-model.number="accountId" class="border rounded px-3 py-2 w-full">
                        <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
                    </select>
                </div>
            </div>
        </template>

        <!-- body -->
        <div class="space-y-4">
            <div class="rounded border-2 border-dashed px-4 py-10 text-center text-gray-600" @dragover="onDragOver"
                @drop="onDrop">
                <p class="mb-3">Arrasta aqui o ficheiro CSV (ou clica para escolher)</p>
                <input id="csv-file" type="file" accept=".csv,text/csv" class="hidden" @change="onPickFile" />
                <label for="csv-file" class="px-3 py-1.5 rounded bg-black text-white cursor-pointer">
                    Escolher ficheiro
                </label>
                <p v-if="fileName" class="mt-2 text-sm text-gray-500">{{ fileName }}</p>
                <p v-if="parsing" class="mt-2 text-sm">A processar…</p>
                <p v-if="errorMsg" class="mt-2 text-sm text-red-600">{{ errorMsg }}</p>
            </div>

            <div v-if="drafts.length" class="rounded border overflow-hidden">
                <div class="bg-gray-50 px-3 py-2 text-sm flex items-center justify-between gap-4 flex-wrap">
                    <div class="flex items-center gap-4">
                        <div>{{ drafts.length }} linhas no ficheiro</div>
                        <div class="hidden sm:block">•</div>
                        <div>{{ visibleDrafts.length }} a importar</div>
                        <div class="hidden sm:block">•</div>
                        <div>
                            Total: <strong>{{ formatCentsEUR(totalCents) }}</strong>
                            <span class="text-gray-500 ml-2">
                                (+{{formatCentsEUR(credits.reduce((s, d) => s + d.cents, 0))}}
                                | {{formatCentsEUR(debits.reduce((s, d) => s + d.cents, 0))}})
                            </span>
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <label class="flex items-center gap-2 text-gray-700">
                            <input type="checkbox" v-model="skipDuplicates" /> Ignorar duplicados
                        </label>
                        <Button variant="ghost" size="sm" @click="reset" :disabled="importing">Limpar</Button>
                        <Button variant="primary" size="sm" :disabled="!canImport" @click="importAll">
                            {{ importing ? "A importar…" : `Importar ${visibleDrafts.length}` }}
                        </Button>
                    </div>
                </div>

                <ul class="divide-y max-h-[60vh] overflow-auto text-sm">
                    <li class="grid grid-cols-[5rem_1fr_10rem_5rem_5rem] gap-3 px-3 py-2 bg-gray-50 sticky top-0">
                        <span>Data</span><span>Descrição</span><span>Categoria</span><span>Tipo</span><span>Valor</span>
                    </li>

                    <li v-for="(d, i) in visibleDrafts" :key="`${d.date}-${i}-${d.description}`"
                        class="grid grid-cols-[5rem_1fr_10rem_5rem_5rem] gap-3 px-3 py-2 items-center">
                        <span class="text-gray-700 whitespace-nowrap">{{ d.date }}</span>

                        <span class="truncate" :title="d.description">{{ d.description }}</span>

                        <div class="flex items-center gap-2 truncate">
                            <Button variant="ghost" size="sm" class="flex gap-2 p-4 w-full" @click="openPicker(i)"
                                title="Remover categoria">
                                <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300 shrink-0"
                                    :style="{ backgroundColor: childColorById.get(d.categoryId || 0) || 'transparent' }" />
                                <span class="truncate">
                                    {{ d.categoryId ?
                                        (childLabelById.get(d.categoryId) ??
                                            `#${d.categoryId}`) : "Sem categoria"
                                    }}
                                </span>

                            </Button>
                            <!-- <button class="underline cursor-pointer whitespace-nowrap" @click="">Alterar</button> -->
                        </div>

                        <button class="px-2 py-0.5 rounded text-xs font-medium w-max cursor-pointer" :class="d.kind === 'DEBIT'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-green-50 text-green-700 border border-green-200'" @click="toggleKind(d)">
                            {{ d.kind === "DEBIT" ? "Débito" : "Crédito" }}
                        </button>

                        <span class="whitespace-nowrap" :class="d.cents < 0 ? 'text-red-600' : 'text-green-700'">
                            {{ formatCentsEUR(d.cents) }}
                        </span>
                    </li>
                </ul>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button variant="ghost" @click="close">Fechar</Button>
                <Button variant="primary" :disabled="!canImport" @click="importAll">
                    {{ importing ? "A importar…" : `Importar ${visibleDrafts.length}` }}
                </Button>
            </div>
        </template>

        <!-- nested picker modal -->
        <CategoryPickerModal v-model:open="showPicker" :account-id="accountId || null"
            :current-category-id="(pickingIndex != null ? visibleDrafts[pickingIndex].categoryId : null) ?? null"
            @pick="onPickCategory" />
    </BaseModal>
</template>
