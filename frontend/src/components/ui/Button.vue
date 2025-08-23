<script setup lang="ts">
import { computed, ref } from "vue";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const props = withDefaults(defineProps<{
    variant?: Variant;
    size?: Size;
    block?: boolean;
    rounded?: "md" | "lg" | "xl" | "full" | "default";
    disabled?: boolean;
    loading?: boolean;
    type?: "button" | "submit" | "reset";
    title?: string;
    href?: string;
    action?: (() => void | Promise<void>) | null;
}>(), {
    variant: "primary",
    size: "md",
    block: false,
    rounded: "default",
    disabled: false,
    loading: false,
    type: "button",
    action: null
});

const emit = defineEmits<{ (e: "click", ev: MouseEvent): void }>();

const internalLoading = ref(false);
const isBusy = computed(() => props.loading || internalLoading.value);

const base =
    "inline-flex items-center justify-center gap-2 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition duration-200 cursor-pointer";

const sizes: Record<Size, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-11 px-5 text-base",
};

const roundedMap = {
    default: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
};

const variants: Record<Variant, string> = {
    primary: "bg-black text-white hover:bg-black/80 focus-visible:ring-black",
    secondary: "bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-gray-900",
    ghost: "bg-transparent border-1 border-black text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-600",
};

const cls = computed(() => [
    base,
    sizes[props.size],
    variants[props.variant],
    roundedMap[props.rounded],
    props.block ? "w-full" : "",
].join(" "));

async function handleClick(e: MouseEvent) {
    if (props.disabled || isBusy.value) return;
    emit("click", e);
    if (props.action) {
        try {
            internalLoading.value = true;
            await props.action();
        } finally {
            internalLoading.value = false;
        }
    }
}
</script>

<template>
    <component :is="href ? 'a' : 'button'" :href="href" :type="href ? undefined : type" :title="title" :class="cls"
        :disabled="!!href ? undefined : (disabled || isBusy)" @click="handleClick">
        <!-- Spinner when busy -->
        <svg v-if="isBusy" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" stroke-width="4"
                stroke-linecap="round" />
        </svg>

        <slot />
    </component>
</template>
