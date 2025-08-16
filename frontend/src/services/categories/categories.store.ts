// src/services/categories/categories.store.ts
import { ref, computed } from "vue";
import { CategoryService } from "./categories.service";
import type { Category, CreateCategoryDto, UpdateCategoryDto } from "@/types/categories";

/**
 * Portuguese labels for backend types.
 * Extend/override as needed without breaking anything — unknown keys fall back to the raw type.
 */
const TYPE_LABELS_PT: Record<string, string> = {
    income: "Receita",
    expense: "Despesa",
    transfer: "Transferência",
};

function translateType(type: string | undefined | null): string {
    const key = (type ?? "").toString().toLowerCase();
    return TYPE_LABELS_PT[key] ?? (type ?? "");
}

const roots = ref<Category[]>([]);
const loading = ref(false);
const error = ref<string>("");

export function useCategories() {
    async function load(force = false) {
        if (loading.value && !force) return;
        loading.value = true;
        error.value = "";

        try {
            const data = await CategoryService.listTree();
            roots.value = (data ?? []).map((r: Category) => ({
                ...r,
                children: r.children ?? [],
            }));
        } catch (e: any) {
            // Treat empty tree responses as a valid empty state
            const status = e?.response?.status;
            const msg = (e?.response?.data?.message ?? "").toString().toLowerCase();
            const isEmptyState =
                status === 404 || status === 204 ||
                msg.includes("no categories") || msg.includes("sem categorias") ||
                msg.includes("not found") || e?.code === "NO_CATEGORIES";

            if (isEmptyState) {
                roots.value = [];
                error.value = "";
            } else {
                roots.value = [];
                error.value = e?.response?.data?.message ?? "Falha ao carregar categorias.";
            }
        } finally {
            loading.value = false;
        }
    }

    async function createRoot(payload: Omit<CreateCategoryDto, "parentId">) {
        const c = await CategoryService.create(payload);
        roots.value.push({ ...c, children: c.children ?? [] });
    }

    async function createChild(parentId: number, payload: Omit<CreateCategoryDto, "parentId">) {
        const c = await CategoryService.create({ ...payload, parentId });
        const parent = roots.value.find((r) => r.id === parentId);
        if (parent) {
            parent.children = parent.children ?? [];
            parent.children.push(c);
        } else {
            await load(true);
        }
    }

    /**
     * Edit a category (root or child). Works for subcategories too.
     * Example patch: { name: "Nova", type: "expense" }
     */
    async function update(id: number, patch: UpdateCategoryDto) {
        const updated = await CategoryService.update(id, patch);

        const rIdx = roots.value.findIndex((r) => r.id === id);
        if (rIdx >= 0) {
            roots.value[rIdx] = { ...roots.value[rIdx], ...updated };
            return;
        }

        for (const r of roots.value) {
            const idx = (r.children ?? []).findIndex((c) => c.id === id);
            if (idx >= 0) {
                r.children![idx] = { ...r.children![idx], ...updated };
                return;
            }
        }
    }

    async function remove(id: number) {
        await CategoryService.hardDelete(id);
        const rIdx = roots.value.findIndex((r) => r.id === id);
        if (rIdx >= 0) {
            roots.value.splice(rIdx, 1);
            return;
        }
        for (const r of roots.value) {
            const idx = (r.children ?? []).findIndex((c) => c.id === id);
            if (idx >= 0) {
                r.children!.splice(idx, 1);
                return;
            }
        }
    }

    // --- extra actions used by the tree component ---
    async function move(id: number, parentId: number | null) {
        await CategoryService.move(id, parentId);
        // remove locally from old location
        let moved: Category | undefined;

        // if it was a root
        const rIdx = roots.value.findIndex((r) => r.id === id);
        if (rIdx >= 0) moved = roots.value.splice(rIdx, 1)[0];

        // else search in children
        if (!moved) {
            for (const r of roots.value) {
                const idx = (r.children ?? []).findIndex((c) => c.id === id);
                if (idx >= 0) {
                    moved = r.children!.splice(idx, 1)[0];
                    break;
                }
            }
        }
        if (!moved) return;

        moved.parentId = parentId;

        if (parentId === null) {
            roots.value.push(moved);
        } else {
            const parent = roots.value.find((r) => r.id === parentId);
            if (parent) {
                parent.children = parent.children ?? [];
                parent.children.push(moved);
            } else {
                await load(true); // fallback if local state is out of sync
            }
        }
    }

    /**
     * Drag & drop friendly reorder:
     * - Reorders locally first (optimistic UI)
     * - Calls API
     * - Rolls back on error
     *
     * @param parentId null => roots; otherwise ID of parent category
     * @param orderedIds array of category IDs in the new order
     */
    async function reorder(parentId: number | null, orderedIds: number[]) {
        // Snapshot for rollback
        const snapshot = JSON.parse(JSON.stringify(roots.value)) as Category[];

        // 1) apply locally
        try {
            if (parentId === null) {
                const byId = new Map(roots.value.map((r) => [r.id, r]));
                roots.value = orderedIds.map((id) => byId.get(id)!).filter(Boolean);
            } else {
                const parent = roots.value.find((r) => r.id === parentId);
                if (!parent) return;
                const byId = new Map((parent.children ?? []).map((c) => [c.id, c]));
                parent.children = orderedIds.map((id) => byId.get(id)!).filter(Boolean);
            }
        } catch {
            // if local update fails for any reason, just bail
            return;
        }

        // 2) persist
        try {
            await CategoryService.reorderSiblings(parentId, orderedIds);
        } catch (e) {
            // 3) rollback & surface error
            roots.value = snapshot;
            throw e;
        }
    }

    async function archive(id: number) {
        await CategoryService.archive(id);
        await load(true);
    }

    async function hardDelete(id: number) {
        await remove(id);
    }

    // Helpful computed states
    const hasCategories = computed(() => roots.value.length > 0);
    const isEmpty = computed(() => !loading.value && roots.value.length === 0 && !error.value);

    // Expose a safe, read-only map + translator for components
    const typeLabelsPt = TYPE_LABELS_PT as Readonly<Record<string, string>>;
    const getTypeLabelPt = (type: string | undefined | null) => translateType(type);

    // expose both the old and the names your component expects
    return {
        roots,
        loading,
        error,
        load,
        createRoot,
        createChild,
        update, // edits both categories and subcategories
        remove,

        // aliases for CategoryTree.vue
        tree: roots,
        addRoot: createRoot,
        addChild: createChild,
        edit: update,
        move,
        reorder,
        archive,
        hardDelete,

        // localization helpers
        typeLabelsPt,
        getTypeLabelPt,

        // UI helpers
        hasCategories,
        isEmpty,
    };
}
