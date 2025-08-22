// src/services/rules/rules.store.ts
import { ref, computed } from "vue";
import { RulesService } from "./rules.service";
import { useCategories } from "@/services/categories/categories.store";
import type { TxRule, CreateRuleDto, UpdateRuleDto } from "@/types/rules";

const items = ref<TxRule[]>([]);
const loading = ref(false);
const error = ref("");

export function useRules() {
    const { roots, load: loadCats } = useCategories();

    // Build flat [childId -> "Parent / Child"] map
    const labelByCategoryId = computed(() => {
        const m = new Map<number, string>();
        for (const r of roots.value || []) {
            for (const c of (r.children || [])) {
                m.set(c.id, `${r.name} / ${c.name}`);
            }
        }
        return m;
    });

    async function load(forceCats = false) {
        try {
            loading.value = true; error.value = "";
            if (forceCats || !(roots.value?.length)) await loadCats();
            const list = await RulesService.list();
            // sort by priority ASC (or whatever your backend uses)
            items.value = [...list].sort((a, b) => a.priority - b.priority);
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? "Falha ao carregar regras.";
            items.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function add(dto: CreateRuleDto) {
        const r = await RulesService.create(dto);
        items.value.push(r);
        items.value.sort((a, b) => a.priority - b.priority);
    }

    async function edit(id: number, patch: UpdateRuleDto) {
        const r = await RulesService.update(id, patch);
        const idx = items.value.findIndex(x => x.id === id);
        if (idx >= 0) items.value[idx] = r;
        items.value.sort((a, b) => a.priority - b.priority);
    }

    async function remove(id: number) {
        await RulesService.remove(id);
        items.value = items.value.filter(x => x.id !== id);
    }

    async function reorder(newOrder: number[]) {
        // optimistic UI
        const byId = new Map(items.value.map(r => [r.id, r]));
        items.value = newOrder.map(id => byId.get(id)!).filter(Boolean);
        try {
            await RulesService.reorder(newOrder);
        } catch {
            // reload on error
            await load();
        }
    }

    return { items, loading, error, load, add, edit, remove, reorder, labelByCategoryId };
}
