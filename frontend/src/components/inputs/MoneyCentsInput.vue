<!-- src/components/inputs/MoneyCentsInput.vue -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";

// Keep typing simple & predictable:
// - Digits 0-9 append to the right (×10 + digit)
// - Backspace removes last digit (Math.floor(/10))
// - Delete clears
// - Paste: parse a money-looking string into cents
// Emits integer cents via v-model.

const props = defineProps<{
    modelValue: number | null | undefined; // cents
    disabled?: boolean;
    placeholder?: string;
    allowNegative?: boolean; // default false
    ariaLabel?: string;
}>();

const emit = defineEmits<{ (e: "update:modelValue", v: number): void }>();

const cents = ref<number>(props.modelValue ?? 0);
watch(
    () => props.modelValue,
    v => { if (typeof v === "number" && v !== cents.value) cents.value = v; }
);

// Format cents -> "pt-PT" EUR string
const formatted = computed(() => {
    const value = (cents.value || 0) / 100;
    return new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
});

function commit(v: number) {
    // Clamp if you want to enforce bounds here
    cents.value = v;
    emit("update:modelValue", v);
}

function handleKeydown(e: KeyboardEvent) {
    if (props.disabled) return;

    // Allowed navigation keys
    const nav = ["ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
    if (nav.includes(e.key)) return;

    // Digits add to the right
    if (/^\d$/.test(e.key)) {
        e.preventDefault();
        const d = Number(e.key);
        commit(cents.value * 10 + d);
        return;
    }

    if (e.key === "Backspace") {
        e.preventDefault();
        commit(Math.trunc((cents.value || 0) / 10));
        return;
    }

    if (e.key === "Delete") {
        e.preventDefault();
        commit(0);
        return;
    }

    if (e.key === "-" && props.allowNegative) {
        e.preventDefault();
        commit(-Math.abs(cents.value || 0));
        return;
    }

    // Swallow everything else (., , etc) to keep the mask stable
    e.preventDefault();
}

function handlePaste(e: ClipboardEvent) {
    if (props.disabled) return;
    e.preventDefault();
    const text = e.clipboardData?.getData("text") ?? "";
    commit(parseEURToCents(text));
}

// Robust parse for PT/US variants into integer cents
function parseEURToCents(input: string | number | null | undefined): number {
    if (input == null) return 0;
    let s = String(input).trim();
    if (!s) return 0;
    s = s.replace(/\s/g, "").replace(/[€$£]/g, "");
    const negative = s.startsWith("-");
    if (negative) s = s.slice(1);

    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const hasComma = lastComma !== -1;
    const hasDot = lastDot !== -1;

    let intPart = "", fracPart = "";

    if (hasComma && hasDot) {
        const i = Math.max(lastComma, lastDot); // rightmost wins as decimal
        intPart = s.slice(0, i).replace(/\D/g, "") || "0";
        fracPart = s.slice(i + 1).replace(/\D/g, "");
    } else if (hasComma) {
        const [a, b = ""] = s.split(",");
        intPart = a.replace(/\D/g, "") || "0";
        fracPart = b.replace(/\D/g, "");
    } else if (hasDot) {
        const thousandsOnly = /^\d{1,3}(?:\.\d{3})+$/.test(s);
        if (thousandsOnly) {
            intPart = s.replace(/\./g, "");
            fracPart = "";
        } else {
            const [a, b = ""] = s.split(".");
            intPart = a.replace(/\D/g, "") || "0";
            fracPart = b.replace(/\D/g, "");
        }
    } else {
        intPart = s.replace(/\D/g, "") || "0";
        fracPart = "";
    }

    fracPart = (fracPart + "00").slice(0, 2);
    let out = Number(intPart) * 100 + Number(fracPart);
    if (!Number.isFinite(out)) out = 0;
    return negative ? -out : out;
}
</script>

<template>
    <!-- Wrapper to keep layout stable; suffix "€" visually present via formatting -->
    <input :value="formatted" :placeholder="placeholder ?? '0,00 €'" :disabled="disabled"
        class="w-full border rounded px-3 py-2" inputmode="numeric" autocomplete="off" autocorrect="off"
        spellcheck="false" :aria-label="ariaLabel ?? 'Montante em euros'" @keydown="handleKeydown" @paste="handlePaste"
        @focus="($event.target as HTMLInputElement)?.select?.()" />
</template>
