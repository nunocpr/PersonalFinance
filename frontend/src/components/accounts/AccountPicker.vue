<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import type { Directive } from "vue";
import type { Account } from "@/types/accounts";
import { formatCentsEUR } from "@/utils/money";
import Button from "../ui/Button.vue";

const props = defineProps<{
    accounts: Account[];
    modelValue: number | null; // selected account id
}>();
const emit = defineEmits<{ (e: "update:modelValue", v: number | null): void }>();

const open = ref(false);

// --- tiny local directive (scoped to this SFC) ---
const vClickOutside: Directive<HTMLElement, () => void> = {
    beforeMount(el, binding) {
        const handler = (e: Event) => {
            const t = e.target as Node | null;
            if (t && (el === t || el.contains(t))) return; // click started inside
            if (!(e instanceof PointerEvent)) return;
            binding.value?.();
        };
        (el as any).__co__ = handler;
        // pointerdown + capture = reliable even if inner elements stop propagation
        document.addEventListener("pointerdown", handler, true);
    },
    unmounted(el) {
        const handler = (el as any).__co__;
        if (handler) {
            document.removeEventListener("pointerdown", handler, true);
            delete (el as any).__co__;
        }
    },
};
// --------------------------------------------------

const selected = computed(() => props.accounts.find(a => a.id === props.modelValue) || null);
const selectedBalance = computed(() => selected.value ? formatCentsEUR(selected.value.balance) : "");
const totalAll = computed(() => props.accounts.reduce((s, a) => s + (a.balance || 0), 0));
const totalAllLabel = computed(() => formatCentsEUR(totalAll.value));

function toggle() { open.value = !open.value; }
function select(id: number) { emit("update:modelValue", id); open.value = false; }

// keep simple ESC handling
function onEsc(e: KeyboardEvent) { if (e.key === "Escape") open.value = false; }
onMounted(() => window.addEventListener("keydown", onEsc));
onBeforeUnmount(() => window.removeEventListener("keydown", onEsc));
</script>

<template>
    <!-- attach to a wrapper that contains BOTH the trigger and the menu -->
    <div v-click-outside="() => (open = false)" class="relative">
        <Button variant="ghost" size="lg" title="Criar Conta" @click="toggle">
            <div class="truncate">
                <div class="truncate">
                    <span v-if="selected" class="text-sm">{{ selected.name }}</span>
                    <span v-else class="text-sm text-gray-500">Escolhe uma conta</span>
                </div>
                <div v-if="selected" class="text-right text-xs text-gray-500">{{ selectedBalance }}</div>
            </div>
            <svg viewBox="0 0 24 24" class="w-4 h-4 fill-gray-700" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
            </svg>
        </Button>

        <div v-if="open"
            class="absolute z-50 mt-1 w-[18rem] right-0 max-h-72 overflow-auto bg-gray-50 border rounded drop-shadow-lg">
            <template v-if="props.accounts.length">
                <button v-for="a in props.accounts" :key="a.id" type="button" :class="[
                    'w-full text-left px-3 py-2 cursor-pointer flex items-center justify-between gap-3',
                    a.id === props.modelValue
                        ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                        : 'bg-gray-100 hover:bg-gray-50 text-gray-500'
                ]" @click="select(a.id)">
                    <span class="truncate text-sm">{{ a.name }}</span>
                    <span class="text-xs shrink-0">{{ formatCentsEUR(a.balance) }}</span>
                </button>

                <div class="sticky bottom-0 bg-gray-100 border-t px-3 py-2 text-sm flex items-center justify-between">
                    <span>Total de contas</span>
                    <strong>{{ totalAllLabel }}</strong>
                </div>
            </template>

            <div v-else class="px-3 py-3 text-sm text-gray-600">
                Não tens contas. Cria a tua primeira conta em “Contas”.
            </div>
        </div>
    </div>
</template>
