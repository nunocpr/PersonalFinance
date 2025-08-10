import { toRaw, watch, WatchSource } from "vue";

/**
 * Watch any reactive value and log changes with a label.
 * @param source - The reactive ref, computed, or getter to watch.
 * @param label - A label for console output.
 */
export function wlog<T>(label: string, source: WatchSource<T>) {
    watch(
        source,
        (newVal, oldVal) => {
            console.log(`[watchDebug] ${label}:`, {
                oldVal: oldVal ? toRaw(oldVal) : oldVal,
                newVal: newVal ? toRaw(newVal) : newVal,
            });
        },
        { immediate: true }
    );
}
