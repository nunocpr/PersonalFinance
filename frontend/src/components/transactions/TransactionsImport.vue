<script setup lang="ts">
import { ref, computed } from "vue";
import { useAccounts } from "@/services/accounts/accounts.store";
import { useTransactions } from "@/services/transactions/transactions.store";
import { fileToText } from "@/utils/csv/fileToText";
import { parseMillenniumCsvWithPapa, type RawCsvRow } from "@/utils/csv/papaMillennium";
import { formatCentsEUR } from "@/utils/money";

const { items: accounts, activeId } = useAccounts();
const tx = useTransactions();

const open = ref(false);
const parsing = ref(false);
const rows = ref<RawCsvRow[]>([]);
const fileName = ref<string>("");

const accountId = ref<number | null>(null);
const canImport = computed(() => !!rows.value.length && !!accountId.value);

function toggle() { open.value = !open.value; }
function reset() { rows.value = []; fileName.value = ""; }

async function onPickFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await parseFile(file);
    input.value = "";
}

async function onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) await parseFile(file);
}
function onDragOver(e: DragEvent) { e.preventDefault(); }

async function parseFile(file: File) {
    parsing.value = true;
    try {
        fileName.value = file.name;
        accountId.value ??= activeId.value ?? null;
        const text = await fileToText(file);
        rows.value = parseMillenniumCsvWithPapa(text);
    } finally {
        parsing.value = false;
    }
}

async function importAll() {
    if (!accountId.value || rows.value.length === 0) return;
    // map to TxCreateDto (amount in cents)
    const drafts = rows.value.map(r => ({
        accountId: accountId.value!,
        date: r.date,
        amount: r.cents,
        description: r.description,
        categoryId: null,
    }));
    await tx.bulkAdd(drafts);
    reset();
    open.value = false;
}
</script>

<template>
    <section class="rounded border bg-white">
        <header class="flex items-center justify-between px-4 py-3">
            <h3 class="font-medium">Importar CSV (Millennium)</h3>
            <button class="underline cursor-pointer" @click="toggle">
                {{ open ? 'Fechar' : 'Abrir' }}
            </button>
        </header>

        <div v-if="open" class="border-t px-4 py-4 space-y-4">
            <!-- account -->
            <label class="block">
                <span class="block text-sm text-gray-600 mb-1">Conta</span>
                <select v-model.number="accountId" class="border rounded px-3 py-2">
                    <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
                </select>
            </label>

            <!-- drop zone -->
            <div class="rounded border-2 border-dashed px-4 py-10 text-center text-gray-600" @dragover="onDragOver"
                @drop="onDrop">
                <p class="mb-3">Arrasta aqui o ficheiro CSV (ou clica para escolher)</p>
                <input type="file" accept=".csv,text/csv" class="hidden" id="csv-file" @change="onPickFile" />
                <label for="csv-file" class="px-3 py-1.5 rounded bg-black text-white cursor-pointer">Escolher
                    ficheiro</label>
                <p v-if="fileName" class="mt-2 text-sm text-gray-500">{{ fileName }}</p>
                <p v-if="parsing" class="mt-2 text-sm">A processar…</p>
            </div>

            <!-- preview -->
            <div v-if="rows.length" class="rounded border overflow-hidden">
                <div class="bg-gray-50 px-3 py-2 text-sm flex items-center justify-between">
                    <div>{{ rows.length }} linhas prontas para importar</div>
                    <button class="px-3 py-1.5 rounded bg-black text-white disabled:opacity-50" :disabled="!canImport"
                        @click="importAll">
                        Importar tudo
                    </button>
                </div>

                <ul class="divide-y max-h-80 overflow-auto text-sm">
                    <li class="grid grid-cols-[10rem_1fr_10rem] gap-3 px-3 py-2 bg-gray-50 sticky top-0">
                        <span>Data</span><span>Descrição</span><span class="text-right">Valor</span>
                    </li>
                    <li v-for="(r, i) in rows" :key="i" class="grid grid-cols-[10rem_1fr_10rem] gap-3 px-3 py-2">
                        <span class="text-gray-700">{{ r.date }}</span>
                        <span class="truncate">{{ r.description }}</span>
                        <span class="text-right" :class="r.cents < 0 ? 'text-red-600' : 'text-green-700'">
                            {{ formatCentsEUR(r.cents) }}
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    </section>
</template>
