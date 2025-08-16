<script setup lang="ts">
defineOptions({ name: "CategoriesView" });
import { ref, computed, onMounted } from "vue";
import { useCategories } from "@/services/categories/categories.store";
import type { CategoryKind } from "@/types/categories";
import CategoryTree from "@/components/categories/CategoryTree.vue";

const {
    roots, load, loading, error, isEmpty,
    addRoot, typeLabelsPt
} = useCategories();

onMounted(() => { load(); });

// derive valid kinds from the map (typed)
const kinds = computed(() => Object.keys(typeLabelsPt) as CategoryKind[]);

// formulário “nova categoria”
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
    <div class="max-w-5xl mx-auto p-6 space-y-8">
        <header class="flex items-end justify-between gap-6 flex-wrap">
            <div>
                <h1 class="text-2xl font-semibold">Categorias</h1>
                <p class="text-gray-600">Gere categorias, subcategorias e a sua ordem.</p>
            </div>

            <!-- Novo root -->
            <form class="flex items-end gap-3" @submit.prevent="createRoot">
                <div>
                    <label for="category-name" class="block text-sm text-gray-600 mb-1">Nome</label>
                    <input id="category-name" name="category-name" v-model="name"
                        class="border rounded px-3 py-1 text-sm" placeholder="Ex.: Alimentação" />
                </div>
                <div>
                    <label for="category-type" class="block text-sm text-gray-600 mb-1">Tipo</label>
                    <select id="category-type" name="category-type" v-model="type"
                        class="border rounded px-3 py-1.5 text-sm">
                        <option v-for="k in kinds" :key="k" :value="k">{{ typeLabelsPt[k] }}</option>
                    </select>
                </div>
                <button class="cursor-pointer px-4 py-1.5 text-sm rounded bg-black text-white"
                    :disabled="saving || !type">
                    {{ saving ? "A criar…" : "Adicionar" }}
                </button>
            </form>
        </header>

        <!-- Estados -->
        <div v-if="loading" class="text-gray-600">A carregar categorias…</div>
        <div v-else-if="error" class="text-red-600">{{ error }}</div>
        <div v-else-if="isEmpty" class="text-gray-600">Não existem categorias.</div>

        <!-- Árvore -->
        <CategoryTree v-else :nodes="roots" class="block" />

        <!-- Mensagens do formulário -->
        <p v-if="msg" class="text-green-600 text-sm">{{ msg }}</p>
        <p v-if="err" class="text-red-600 text-sm">{{ err }}</p>
    </div>
</template>
