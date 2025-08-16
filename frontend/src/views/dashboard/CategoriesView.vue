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
        <!-- header matches AccountsView -->
        <div class="flex items-center justify-between">
            <h1 class="text-xl font-heading">Gerir categorias</h1>
            <RouterLink class="underline" :to="{ name: 'dashboard' }">Voltar ao painel principal</RouterLink>
        </div>

        <!-- create card (same card style used across the app) -->
        <section class="bg-white rounded p-6 px-12 shadow-md border mt-12">
            <form class="flex flex-wrap items-end gap-6" @submit.prevent="createRoot">
                <div class="min-w-[220px]">
                    <label for="category-name" class="block text-sm text-gray-600 mb-1">Nome</label>
                    <input id="category-name" name="category-name" v-model="name"
                        class="w-full border rounded px-3 py-2 text-sm" placeholder="Ex.: Alimentação" />
                </div>

                <div>
                    <label for="category-type" class="block text-sm text-gray-600 mb-1">Tipo</label>
                    <select id="category-type" name="category-type" v-model="type"
                        class="border rounded px-3 py-2 text-sm">
                        <option v-for="k in kinds" :key="k" :value="k">{{ typeLabelsPt[k] }}</option>
                    </select>
                </div>

                <button class="cursor-pointer px-4 py-2 text-sm rounded bg-black text-white"
                    :disabled="saving || !type">
                    {{ saving ? "A criar…" : "Adicionar" }}
                </button>

                <!-- inline messages -->
                <p v-if="msg" class="text-green-600 text-sm">{{ msg }}</p>
                <p v-if="err" class="text-red-600 text-sm">{{ err }}</p>
            </form>
        </section>

        <!-- states & tree (kept consistent with Accounts view spacing) -->
        <div v-if="loading" class="text-gray-600">A carregar categorias…</div>
        <div v-else-if="error" class="text-red-600">{{ error }}</div>
        <div v-else-if="isEmpty" class="text-gray-600">Não existem categorias.</div>

        <CategoryTree v-else :nodes="roots" class="block" />
    </div>
</template>
