<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import type { Account } from "@/types/accounts";
import { formatCentsEUR } from "@/utils/money";

const props = defineProps<{
    accounts: Account[];
    modelValue: number | null; // selected account id
}>();
const emit = defineEmits<{ (e: "update:modelValue", v: number | null): void }>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);

const selected = computed(() => props.accounts.find(a => a.id === props.modelValue) || null);
const selectedBalance = computed(() => selected.value ? formatCentsEUR(selected.value.balance) : "");
const totalAll = computed(() => props.accounts.reduce((s, a) => s + (a.balance || 0), 0));
const totalAllLabel = computed(() => formatCentsEUR(totalAll.value));

function toggle() { open.value = !open.value; }
function select(id: number) { emit("update:modelValue", id); open.value = false; }

function onDocClick(e: MouseEvent) {
    if (!root.value) return;
    if (!root.value.contains(e.target as Node)) open.value = false;
}
function onEsc(e: KeyboardEvent) { if (e.key === "Escape") open.value = false; }

onMounted(() => {
    document.addEventListener("click", onDocClick);
    window.addEventListener("keydown", onEsc);
});
onBeforeUnmount(() => {
    document.removeEventListener("click", onDocClick);
    window.removeEventListener("keydown", onEsc);
});
</script>

<template>
    <div ref="root" class="relative">
        <!-- Closed control: name + gray balance -->
        <button type="button"
            class="rounded px-3 bg-white hover:border-black cursor-pointer flex items-center justify-end gap-4"
            @click="toggle">
            <div class="truncate">
                <div class="truncate">
                    <span v-if="selected" class="text-sm">{{ selected.name }}</span>
                    <span v-else class="text-sm text-gray-500">Escolhe uma conta</span>
                </div>
                <div v-if="selected" class="text-xs text-gray-500">{{ selectedBalance }}</div>
            </div>
            <svg viewBox="0 0 24 24" class="w-4 h-4 text-gray-600" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
            </svg>
        </button>

        <!-- Dropdown -->
        <div v-if="open"
            class="absolute z-50 mt-1 w-[18rem] right-0 max-h-72 overflow-auto bg-gray-50 border rounded drop-shadow-lg">
            <template v-if="props.accounts.length">
                <button v-for="a in props.accounts" :key="a.id" type="button" :class="[
                    'w-full text-left px-3 py-2 cursor-pointer flex items-center justify-between gap-3',
                    a.id === props.modelValue ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-100 hover:bg-gray-50 text-gray-500'
                ]" @click="select(a.id)">
                    <span class="truncate text-sm">{{ a.name }}</span>
                    <span class="text-xs shrink-0">{{ formatCentsEUR(a.balance) }}</span>
                </button>

                <!-- footer: total de todas as contas -->
                <div class="sticky bottom-0 bg-gray-100 border-t px-3 py-2 text-sm flex items-center justify-between">
                    <span class="">Total de contas</span>
                    <strong>{{ totalAllLabel }}</strong>
                </div>
            </template>

            <div v-else class="px-3 py-3 text-sm text-gray-600">
                Não tens contas. Cria a tua primeira conta em “Contas”.
            </div>
        </div>
    </div>
</template>
