<!-- src/components/ui/BaseModal.vue -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref, nextTick } from "vue";

const props = withDefaults(defineProps<{
    open: boolean
    closeOnEsc?: boolean
    closeOnBackdrop?: boolean
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl"
    /** aria-labelledby target id (optional) */
    labelledby?: string
}>(), {
    closeOnEsc: true,
    closeOnBackdrop: true,
    maxWidth: "md",
});

const emit = defineEmits<{
    (e: "update:open", v: boolean): void
    (e: "after-open"): void
    (e: "after-close"): void
}>();

function close() { emit("update:open", false); }

const previouslyFocused = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

function onKeydown(e: KeyboardEvent) {
    if (!props.open) return;
    if (props.closeOnEsc && e.key === "Escape") {
        e.stopPropagation();
        close();
    }
}

// very light focus handling (first focusable)
async function focusFirst() {
    await nextTick();
    const root = panelRef.value;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusables[0] ?? root).focus();
}

let locks = 0;
let prevOverflow = "";
let prevPaddingRight = "";

function getScrollbarWidth() {
    // difference between layout viewport and visual viewport width
    return window.innerWidth - document.documentElement.clientWidth;
}

function lockBodyScroll(on: boolean) {
    const body = document.body;

    if (on) {
        if (++locks > 1) return; // support nested modals
        prevOverflow = body.style.overflow;
        prevPaddingRight = body.style.paddingRight;

        const sbw = getScrollbarWidth();
        if (sbw > 0) {
            const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
            body.style.paddingRight = `${current + sbw}px`;
        }
        body.style.overflow = "hidden";
    } else {
        if (--locks > 0) return;
        body.style.overflow = prevOverflow;
        body.style.paddingRight = prevPaddingRight;
    }
}

watch(() => props.open, async (o, prev) => {
    if (o === prev) return;
    if (o) {
        previouslyFocused.value = (document.activeElement as HTMLElement) ?? null;
        window.addEventListener("keydown", onKeydown, { capture: true });
        lockBodyScroll(true);
        await focusFirst();
        emit("after-open");
    } else {
        window.removeEventListener("keydown", onKeydown, { capture: true });
        lockBodyScroll(false);
        // return focus to previous trigger
        previouslyFocused.value?.focus?.();
        emit("after-close");
    }
}, { immediate: true });

onMounted(() => {
    if (props.open) {
        window.addEventListener("keydown", onKeydown, { capture: true });
        lockBodyScroll(true);
    }
});
onBeforeUnmount(() => {
    window.removeEventListener("keydown", onKeydown, { capture: true });
    lockBodyScroll(false);
});

const maxW = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
}[props.maxWidth];
</script>

<template>
    <teleport to="body">
        <transition name="fade">
            <div v-if="open" class="fixed inset-0 z-[9999] grid place-items-center bg-black/40" role="dialog"
                aria-modal="true" :aria-labelledby="labelledby" @click.self="closeOnBackdrop ? close() : undefined">
                <div ref="panelRef"
                    :class="['bg-white rounded-xl w-full p-5 space-y-4 shadow-xl outline-none max-h-[90dvh] overflow-auto', maxW]"
                    tabindex="-1">
                    <header v-if="$slots.header" class="mb-1">
                        <slot name="header" />
                    </header>

                    <slot />

                    <footer v-if="$slots.footer" class="pt-2">
                        <slot name="footer" />
                    </footer>
                </div>
            </div>
        </transition>
    </teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity .2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
