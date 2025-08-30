<script setup lang="ts">
import Button from "@/components/ui/Button.vue";
import { Pencil, Trash2 } from "lucide-vue-next";
import { formatCentsEUR } from "@/utils/money";
import { computed } from "vue";

const props = defineProps<{
    items: any[];
    templateColumns: string;
    displayNameById: Map<number, string>;
    childColorById: Map<number, string | null>;
}>();
const emit = defineEmits<{ (e: "edit", t: any): void; (e: "remove", id: string): void }>();

function monthKeyFromISO(iso?: string | null) {
    const d = (iso || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "????-??";
    return d.slice(0, 7);
}
function monthLabel(key: string) {
    const [y, m] = key.split("-").map(n => parseInt(n, 10));
    const date = new Date(y, (m || 1) - 1, 1);
    return new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(date);
}

const groups = computed(() => {
    const by = new Map<string, any[]>();
    for (const t of props.items || []) {
        const k = monthKeyFromISO(t.date);
        if (!by.has(k)) by.set(k, []);
        by.get(k)!.push(t);
    }
    return Array.from(by.entries())
        .map(([key, rows]) => ({ key, label: monthLabel(key), rows }))
        .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
});
</script>

<template>
    <template v-for="g in groups" :key="g.key">
        <li class="px-3 py-2 bg-gray-50 text-sm font-medium flex items-center gap-2">{{ g.label }}</li>

        <li v-for="t in g.rows" :key="t.id" role="row" class="grid gap-x-4 px-3 py-3"
            :style="{ gridTemplateColumns: templateColumns }">
            <div class="text-gray-700 whitespace-nowrap">{{ t.date?.slice(0, 10) }}</div>

            <div class="truncate flex items-center gap-2">
                <span class="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-gray-300 shrink-0"
                    :style="{ backgroundColor: props.childColorById.get(t.categoryId || 0) || 'transparent' }" />
                {{ props.displayNameById.get(t.categoryId || 0) || "—" }}
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
</template>
