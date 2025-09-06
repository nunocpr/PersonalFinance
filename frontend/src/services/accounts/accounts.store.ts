// src/services/accounts/accounts.store.ts
import { ref, computed, watch } from "vue";
import { AccountService } from "./accounts.service";
import type { Account, CreateAccountDto, UpdateAccountDto } from "@/types/accounts";

const items = ref<Account[]>([]);
const loaded = ref(false);
const loading = ref(false);

const ACTIVE_KEY = "pf_active_account";
const savedInitial = (() => { try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } })();
const activeId = ref<number | null>(savedInitial ? Number(savedInitial) : null);

const activeAccount = computed(() => items.value.find((a) => a.id === activeId.value) || null);

function setActive(id: number | null) {
    activeId.value = id;
    try { id == null ? localStorage.removeItem(ACTIVE_KEY) : localStorage.setItem(ACTIVE_KEY, String(id)); } catch { }
}

const ACCOUNT_TYPE_LABELS_PT: Record<string, string> = {
    checking: "Conta à ordem",
    savings: "Poupança",
    credit: "Crédito",
    investment: "Investimento",
    other: "Outro",
};
function getAccountTypeLabelPt(type?: string | null) {
    const key = (type ?? "").toLowerCase();
    return ACCOUNT_TYPE_LABELS_PT[key] ?? (type ?? "");
}

/** NEW: live, computed balances */
const currentBalanceById = ref<Map<number, number>>(new Map());

async function refreshCurrentBalance(accountId: number) {
    const v = await AccountService.getCurrentBalance(accountId);
    const m = new Map(currentBalanceById.value);
    m.set(accountId, v);
    currentBalanceById.value = m;
}

async function refreshAllCurrentBalances() {
    if (!items.value.length) return;
    const results = await Promise.allSettled(items.value.map(a => AccountService.getCurrentBalance(a.id)));
    const m = new Map<number, number>();
    items.value.forEach((a, i) => {
        const r = results[i];
        m.set(a.id, r.status === "fulfilled" ? r.value : 0);
    });
    currentBalanceById.value = m;
}

export function useAccounts() {
    async function load(force = false) {
        if (loading.value) return;
        if (loaded.value && !force) return;
        loading.value = true;
        try {
            items.value = await AccountService.list();
            loaded.value = true;

            // active selection hygiene
            if (activeId.value != null && !items.value.some(a => a.id === activeId.value)) {
                setActive(items.value[0]?.id ?? null);
            }
            if (activeId.value == null && items.value.length) setActive(items.value[0].id);

            // refresh ALL current balances for UI (picker totals, header, etc.)
            await refreshAllCurrentBalances();
        } finally {
            loading.value = false;
        }
    }

    async function add(payload: CreateAccountDto) {
        const a = await AccountService.create(payload);
        items.value.push(a);
        // immediately get its current balance
        await refreshCurrentBalance(a.id);
        if (activeId.value == null) setActive(a.id);
    }

    async function edit(id: number, patch: UpdateAccountDto) {
        const a = await AccountService.update(id, patch);
        const idx = items.value.findIndex((i) => i.id === id);
        if (idx >= 0) items.value[idx] = a;
        await refreshCurrentBalance(id);
    }

    async function remove(id: number) {
        await AccountService.delete(id);
        items.value = items.value.filter((i) => i.id !== id);
        const next = items.value[0]?.id ?? null;
        if (activeId.value === id) setActive(next);
        if (next != null) await refreshCurrentBalance(next);
    }

    // keep active account fresh when switching
    watch(activeId, async (id) => {
        if (id == null) return;
        if (!currentBalanceById.value.has(id)) await refreshCurrentBalance(id);
    });

    return {
        items,
        loaded,
        loading,
        activeId,
        activeAccount,
        currentBalanceById,
        refreshCurrentBalance,
        refreshAllCurrentBalances,
        setActive,
        load,
        add,
        edit,
        remove,
        accountTypeLabelsPt: ACCOUNT_TYPE_LABELS_PT,
        getAccountTypeLabelPt,
    };
}
