<!-- src/views/dashboard/RulesView.vue -->
<script setup lang="ts">
defineOptions({ name: "RulesView" });
import { onMounted, ref } from "vue";
import Draggable from "vuedraggable";
import { useRules } from "@/services/rules/rules.store";
import RuleModal from "@/components/rules/RuleModal.vue";
import Button from "@/components/ui/Button.vue";

const { items, loading, error, load, add, edit, remove, reorder, labelByCategoryId } = useRules();

const show = ref(false);
const mode = ref<"create" | "edit">("create");
const current = ref<any>(null);

onMounted(() => { load(true); });

function openCreate() { mode.value = "create"; current.value = null; show.value = true; }
function openEdit(r: any) { mode.value = "edit"; current.value = r; show.value = true; }

async function onSave(payload: any) {
    if (mode.value === "create") await add(payload);
    else if (current.value) await edit(current.value.id, payload);
    show.value = false;
}

// on drag end, persist priority ordering
async function onEnd() {
    await reorder(items.value.map(r => r.id));
}
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <h1 class="text-xl font-heading">Regras de classificação</h1>
            <Button variant="primary" size="md" title="Adicionar Regra" @click="openCreate">Adicionar
                regra</Button>

        </div>

        <div v-if="loading" class="text-gray-600">A carregar…</div>
        <div v-else-if="error" class="text-red-600">{{ error }}</div>

        <div v-else class="rounded border bg-white p-3">
            <Draggable :list="items" item-key="id" handle=".grab" @end="onEnd">
                <template #item="{ element: r }">
                    <div
                        class="grid md:grid-cols-[1.5rem,1fr,1fr,12rem,12rem,7rem] gap-3 items-center py-2 border-b last:border-b-0">
                        <div class="grab cursor-grab select-none text-gray-400">⋮⋮</div>
                        <div class="min-w-0">
                            <div class="font-medium truncate">{{ r.name }}</div>
                            <div class="text-xs text-gray-500 truncate">
                                {{ r.isRegex ? 'Regex:' : 'Contém:' }} <span class="font-mono">{{ r.pattern }}</span>
                                <span v-if="r.caseSensitive"> • sensível</span>
                            </div>
                        </div>
                        <div class="text-sm">
                            <span v-if="r.kind === 'DEBIT'">Débito</span>
                            <span v-else-if="r.kind === 'CREDIT'">Crédito</span>
                            <span v-else class="text-gray-500">—</span>
                        </div>
                        <div class="text-sm truncate">
                            {{ r.categoryId ? (labelByCategoryId.get(r.categoryId) || '—') : '—' }}
                        </div>
                        <div class="text-sm text-gray-500">Prioridade: {{ r.priority }}</div>
                        <div class="flex gap-2 justify-end">
                            <Button variant="primary" size="md" title="Adicionar Regra"
                                @click="openEdit(r)">Editar</Button>
                            <Button variant="primary" size="md" title="Editar Regra"
                                :class="r.isActive ? 'border-amber-300 text-amber-700' : 'border-gray-300 text-gray-600'"
                                @click="edit(r.id, { isActive: !r.isActive })"> {{ r.isActive ? 'Desativar' : 'Ativar'
                                }}</Button>
                            <Button variant="danger" size="md" title="Eliminar Regra"
                                @click="remove(r.id)">Eliminar</Button>
                        </div>
                    </div>
                </template>
            </Draggable>

            <div v-if="!items.length" class="text-gray-500 text-sm py-8 text-center">
                Sem regras. Crie a primeira regra.
            </div>
        </div>

        <RuleModal v-model:open="show" :mode="mode" :value="current" @save="onSave" />
    </div>
</template>

<style scoped>
.grab {
    padding: 0 4px;
}
</style>
