import { ref, computed } from "vue";
import { AccountService } from "./accounts.service";
import type { Account, CreateAccountDto, UpdateAccountDto } from "@/types/accounts";

const items = ref<Account[]>([]);
const loaded = ref(false);
const loading = ref(false);

const ACTIVE_KEY = "pf_active_account";

// Initialize from localStorage immediately (before any component mounts)
const savedInitial = (() => {
    try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
})();
const activeId = ref<number | null>(savedInitial ? Number(savedInitial) : null);

const activeAccount = computed(
    () => items.value.find((a) => a.id === activeId.value) || null
);

function setActive(id: number | null) {
    activeId.value = id;
    try {
        if (id == null) localStorage.removeItem(ACTIVE_KEY);
        else localStorage.setItem(ACTIVE_KEY, String(id));
    } catch { /* ignore */ }
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

export function useAccounts() {
    async function load(force = false) {
        if (loading.value) return;
        if (loaded.value && !force) return;
        loading.value = true;
        try {
            items.value = await AccountService.list();
            loaded.value = true;

            // Ensure activeId is valid
            if (activeId.value != null && !items.value.some(a => a.id === activeId.value)) {
                setActive(items.value[0]?.id ?? null);
            }
            if (activeId.value == null && items.value.length) {
                setActive(items.value[0].id);
            }
        } finally {
            loading.value = false;
        }
    }

    async function add(payload: CreateAccountDto) {
        const a = await AccountService.create(payload);
        items.value.push(a);
        if (activeId.value == null) setActive(a.id);
    }

    async function edit(id: number, patch: UpdateAccountDto) {
        const a = await AccountService.update(id, patch);
        const idx = items.value.findIndex((i) => i.id === id);
        if (idx >= 0) items.value[idx] = a;
    }

    async function remove(id: number) {
        await AccountService.delete(id);
        items.value = items.value.filter((i) => i.id !== id);
        if (activeId.value === id) setActive(items.value[0]?.id ?? null);
    }

    return {
        items,
        loaded,
        activeId,
        activeAccount,
        setActive,
        load,
        add,
        edit,
        remove,
        accountTypeLabelsPt: ACCOUNT_TYPE_LABELS_PT as Readonly<Record<string, string>>,
        getAccountTypeLabelPt,
    };
}
