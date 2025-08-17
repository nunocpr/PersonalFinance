import { ref } from "vue";
import { TransactionService } from "./transactions.service";
import type { Transaction, TxFilters, TxCreateDto, TxUpdateDto } from "@/types/transactions";

const items = ref<Transaction[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref("");

export function useTransactions() {
    async function load(filters: TxFilters = {}) {
        try {
            loading.value = true;
            error.value = "";
            const f = { page: page.value, pageSize: pageSize.value, ...filters };
            const res = await TransactionService.list(f);

            // Defensive defaults
            items.value = Array.isArray(res?.items) ? res.items : [];
            total.value = Number(res?.total ?? 0);
            page.value = Number(res?.page ?? f.page ?? 1);
            pageSize.value = Number(res?.pageSize ?? f.pageSize ?? 20);
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? "Falha ao carregar transações.";
            items.value = [];
            total.value = 0;
        } finally {
            loading.value = false;
        }
    }

    async function add(payload: TxCreateDto) {
        const t = await TransactionService.create(payload);
        items.value = [t, ...(items.value || [])];
    }

    async function bulkAdd(drafts: TxCreateDto[], onProgress?: (done: number, total: number) => void) {
        const totalN = drafts.length;
        let done = 0;
        const concurrency = Math.min(4, totalN); // be gentle with the API
        const queue = drafts.slice();

        async function worker() {
            while (queue.length) {
                const d = queue.shift()!;
                try {
                    const t = await TransactionService.create(d);
                    items.value = [t, ...items.value]; // prepend
                } catch (e) {
                    // optional: collect/report errors
                    console.error("bulkAdd error:", e);
                } finally {
                    done++; onProgress?.(done, totalN);
                }
            }
        }
        await Promise.all(Array.from({ length: concurrency }, worker));
    }


    async function edit(id: string, patch: TxUpdateDto) {
        const t = await TransactionService.update(id, patch);
        const idx = (items.value || []).findIndex(x => x.id === id);
        if (idx >= 0) items.value[idx] = t;
    }

    async function remove(id: string) {
        await TransactionService.remove(id);
        items.value = (items.value || []).filter(x => x.id !== id);
    }

    async function setCategory(id: string, categoryId: number | null) {
        const updated = await TransactionService.update(id, { categoryId });
        // update in place
        const idx = items.value.findIndex(t => t.id === id);
        if (idx >= 0) items.value[idx] = { ...items.value[idx], ...updated };
    }


    return { items, total, page, pageSize, loading, error, load, add, bulkAdd, edit, remove, setCategory };
}
