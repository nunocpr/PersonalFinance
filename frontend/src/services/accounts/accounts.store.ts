import { ref, computed } from "vue";
import { AccountService } from "./accounts.service";
import type { Account, CreateAccountDto, UpdateAccountDto } from "@/types/accounts";

const items = ref<Account[]>([]);
const loaded = ref(false);

const ACTIVE_KEY = "pf_active_account";
const activeId = ref<number | null>(null);

const activeAccount = computed(
    () => items.value.find((a) => a.id === activeId.value) || null
);

function setActive(id: number | null) {
    activeId.value = id;
    if (id == null) localStorage.removeItem(ACTIVE_KEY);
    else localStorage.setItem(ACTIVE_KEY, String(id));
}

export function useAccounts() {
    async function load(force = false) {
        if (loaded.value && !force) return;
        items.value = await AccountService.list();
        loaded.value = true;

        if (activeId.value == null) {
            const saved = localStorage.getItem(ACTIVE_KEY);
            if (saved) activeId.value = Number(saved);
        }
        if (activeId.value != null && !items.value.some((a) => a.id === activeId.value)) {
            setActive(items.value[0]?.id ?? null);
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

    return { items, loaded, activeId, activeAccount, setActive, load, add, edit, remove };
}
