<script setup lang="ts">
import Button from "@/components/ui/Button.vue";
import { Pencil, Trash2 } from "lucide-vue-next";
import { formatCentsEUR } from "@/utils/money";

const props = defineProps<{
    items: any[];
    templateColumns: string;
    displayNameById: Map<number, string>;
    childColorById: Map<number, string | null>;
}>();

const emit = defineEmits<{
    (e: "edit", t: any): void;
    (e: "remove", id: string): void;
    (e: "pick", id: string): void;
}>();
</script>

<template>
    <template v-if="items.length">
        <li v-for="t in items" :key="t.id" role="row" class="grid gap-x-4 px-3 py-3"
            :style="{ gridTemplateColumns: templateColumns }">
            <div class="text-gray-700 whitespace-nowrap">{{ t.date?.slice(0, 10) }}</div>

            <div class="truncate flex items-center gap-2">
                <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300 shrink-0"
                    :style="{ backgroundColor: props.childColorById.get(t.categoryId || 0) || 'transparent' }" />
                <Button variant="ghost" size="xs" title="Definir categoria" @click="emit('pick', t.id)">
                    {{ props.displayNameById.get(t.categoryId || 0) || "Definir categoria…" }}
                </Button>
            </div>

            <div class="whitespace-nowrap">
                <span :class="t.amount < 0 ? 'text-red-600' : 'text-green-700'">{{ formatCentsEUR(t.amount) }}</span>
            </div>

            <div class="text-gray-800 truncate">{{ t.description || "—" }}</div>
            <div class="text-gray-700 truncate">{{ t.notes || "—" }}</div>

            <div class="whitespace-nowrap flex items-center gap-2">
                <Button variant="ghost" size="xs" title="Editar" @click="emit('edit', t)">
                    <Pencil class="w-4 h-4" />
                </Button>
                <Button variant="danger" size="xs" title="Eliminar" @click="emit('remove', t.id)">
                    <Trash2 class="w-4 h-4" />
                </Button>
            </div>
        </li>
    </template>

    <li v-else class="px-3 py-16 text-center text-gray-500">Sem transações.</li>
</template>
