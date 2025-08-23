<script setup lang="ts">
defineOptions({ name: "CategoriesView" });

import { ref, computed, onMounted } from "vue";
import { useCategories } from "@/services/categories/categories.store";
import type { CategoryKind } from "@/types/categories";
import CategoryTree from "@/components/categories/CategoryTree.vue";

const { roots, load, loading, error, isEmpty, addRoot, typeLabelsPt } = useCategories();

onMounted(() => { load(); });

// valid kinds from store labels
const kinds = computed(() => Object.keys(typeLabelsPt) as CategoryKind[]);

// “new category” form state
const name = ref("");
const type = ref<CategoryKind | undefined>(kinds.value[0]);
const saving = ref(false);
const msg = ref("");
const err = ref("");

async function createRoot() {
    if (!name.value.trim()) return;
    saving.value = true; msg.value = ""; err.value = "";
    try {
        await addRoot({ name: name.value.trim(), type: type.value });
        name.value = "";
        msg.value = "Categoria criada.";
    } catch (e: any) {
        err.value = e?.response?.data?.message ?? "Não foi possível criar a categoria.";
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <h1 class="text-xl font-heading">Gerir categorias</h1>
            <RouterLink class="underline" :to="{ name: 'dashboard' }">Voltar ao painel principal</RouterLink>
        </div>

        <div v-if="loading" class="text-gray-600">A carregar categorias…</div>
        <div v-else-if="error" class="text-red-600">{{ error }}</div>
        <div v-else-if="isEmpty" class="text-gray-600">Não existem categorias.</div>

        <CategoryTree v-else :nodes="roots" class="block" />
    </div>
</template>
