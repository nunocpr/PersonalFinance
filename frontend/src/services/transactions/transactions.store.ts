// transactions.store.ts
import { computed, ref } from "vue";
import { TransactionService } from "./transactions.service";
import type { Transaction, TxFilters, TxCreateDto, TxUpdateDto } from "@/types/transactions";

/* ─────────────────────────────────────────────────────────────
   State
   ──────────────────────────────────────────────────────────── */
const items = ref<Transaction[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const total = ref(0);
const page = ref(1);
const pageSize = ref(100);
const lastFilters = ref<TxFilters>({});

/* ─────────────────────────────────────────────────────────────
   Derived
   ──────────────────────────────────────────────────────────── */
const hasPrev = computed(() => page.value > 1);
const hasNext = computed(() => page.value * pageSize.value < total.value);
const totalPages = computed(() =>
    Math.max(1, Math.ceil((total.value || 0) / (pageSize.value || 1)))
);

/* ─────────────────────────────────────────────────────────────
   Store API
   ──────────────────────────────────────────────────────────── */
export function useTransactions() {
    /* Load (list with filters + pagination) */
    async function load(filters: TxFilters = {}) {
        try {
            loading.value = true;
            error.value = null;

            const params: TxFilters = {
                ...lastFilters.value,
                accountId: filters.accountId ?? lastFilters.value.accountId,
                page: page.value,
                pageSize: pageSize.value,
                ...filters,
            };

            console.log('PARAMS', params)
            const res = await TransactionService.list(params);

            items.value = Array.isArray(res?.items) ? res.items : [];
            total.value = Number(res?.total ?? 0);
            page.value = Number(res?.page ?? params.page ?? 1);
            pageSize.value = Number(res?.pageSize ?? params.pageSize ?? 20);
            lastFilters.value = { ...params };
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? "Falha ao carregar transações.";
            items.value = [];
            total.value = 0;
        } finally {
            loading.value = false;
        }
    }

    /* Pagination helpers */
    function setPage(p: number) {
        return load({ page: Math.max(1, p) });
    }
    function next() {
        if (hasNext.value) return load({ page: page.value + 1 });
    }
    function prev() {
        if (hasPrev.value) return load({ page: page.value - 1 });
    }
    function setPageSize(n: number) {
        pageSize.value = n;
        return load({ page: 1, pageSize: n }); // reset to first page
    }

    /* Create */
    async function add(payload: TxCreateDto) {
        const t = await TransactionService.create(payload);
        // Only prepend if it matches the current filter (account)
        if (!lastFilters.value.accountId || t.accountId === lastFilters.value.accountId) {
            items.value = [t, ...(items.value || [])];
        }
    }

    /* Bulk create (best-effort, small concurrency) */
    async function bulkAdd(drafts: TxCreateDto[], onProgress?: (done: number, total: number) => void) {
        const totalN = drafts.length;
        let done = 0;
        const concurrency = Math.min(4, totalN);
        const queue = drafts.slice();

        async function worker() {
            while (queue.length) {
                const d = queue.shift()!;
                try {
                    const t = await TransactionService.create(d);
                    if (!lastFilters.value.accountId || t.accountId === lastFilters.value.accountId) {
                        items.value = [t, ...items.value];
                    }
                } catch (e) {
                    console.error("bulkAdd error:", e);
                } finally {
                    done++; onProgress?.(done, totalN);
                }
            }
        }
        await Promise.all(Array.from({ length: concurrency }, worker));
    }

    /* Update (EDIT) — now exposed as `update`, keeping `edit` for backwards-compat */
    async function update(id: string, patch: TxUpdateDto) {
        const t = await TransactionService.update(id, patch);
        const idx = (items.value || []).findIndex((x) => x.id === id);
        if (idx >= 0) {
            // Replace in-place to keep reactivity
            items.value[idx] = t;
        }
        return t;
    }
    const edit = update; // alias for older callers

    /* Delete */
    async function remove(id: string) {
        await TransactionService.remove(id);
        items.value = (items.value || []).filter((x) => x.id !== id);
    }

    /* Convenience: set only the category */
    async function setCategory(id: string, categoryId: number | null) {
        const updated = await TransactionService.update(id, { categoryId });
        const idx = items.value.findIndex((t) => t.id === id);
        if (idx >= 0) items.value[idx] = { ...items.value[idx], ...updated };
    }

    return {
        /* state & derived */
        items,
        total,
        page,
        pageSize,
        hasPrev,
        hasNext,
        totalPages,
        loading,
        error,

        /* actions */
        load,
        add,
        bulkAdd,
        update,   // ← new (preferred)
        edit,     // ← alias (kept for compatibility)
        remove,
        setCategory,

        /* pagination */
        setPage,
        next,
        prev,
        setPageSize,
    };
}
