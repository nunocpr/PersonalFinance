<script setup lang="ts">
import { reactive, watch, computed, onMounted, onBeforeUnmount } from "vue";
import type { Category, CategoryKind } from "@/types/categories";

const props = defineProps<{
  open: boolean;
  parent?: Category | null;
}>();

const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "save", payload: { name: string; description: string | null; color?: string | null; type?: CategoryKind }): void;
}>();

const form = reactive({
  name: "",
  description: "",
  color: "#4f46e5",
  type: "expense" as CategoryKind,
});

const isChild = computed(() => !!props.parent);

watch(() => props.open, (o) => {
  if (o) {
    form.name = "";
    form.description = "";
    form.color = props.parent?.color ?? "#4f46e5";
    form.type = "expense";
  }
});

function close() { emit("update:open", false); }
function save() {
  emit("save", {
    name: form.name.trim(),
    description: form.description?.trim() || null,
    color: isChild.value ? undefined : (form.color || null),
    type: isChild.value ? undefined : form.type,
  });
}

// Close on ESC
function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && props.open) close();
}
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <teleport to="body">
    <!-- Backdrop transition -->
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[9999] grid place-items-center bg-black/40"
        @click.self="close"
      >
        <!-- Panel transition -->
        <transition name="pop">
          <div
            class="bg-white rounded-xl w-full max-w-md p-5 space-y-4 shadow-xl"
          >
            <h2 class="text-lg font-heading">
              {{ isChild ? `Adicionar subcategoria em "${parent?.name}"` : "Adicionar categoria" }}
            </h2>

            <div class="space-y-3">
              <label class="block">
                <div class="text-sm text-gray-600 mb-1">Nome</div>
                <input v-model="form.name" class="w-full border rounded px-3 py-2" />
              </label>

              <label class="block">
                <div class="text-sm text-gray-600 mb-1">Descrição</div>
                <input v-model="form.description" class="w-full border rounded px-3 py-2" />
              </label>

              <div v-if="!isChild" class="grid grid-cols-2 gap-3">
                <label class="block">
                  <div class="text-sm text-gray-600 mb-1">Tipo</div>
                  <select v-model="form.type" class="w-full border rounded px-3 py-2">
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                    <option value="transfer">Transferência</option>
                  </select>
                </label>

                <label class="block">
                  <div class="text-sm text-gray-600 mb-1">Cor</div>
                  <input type="color" v-model="form.color" class="w-full h-10 border rounded" />
                </label>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="px-3 py-1.5 rounded border cursor-pointer" @click="close">Cancelar</button>
              <button type="button" class="px-3 py-1.5 rounded bg-black text-white cursor-pointer" @click="save">Guardar</button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
/* Backdrop fade */
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Panel pop (fade + slight slide) */
.pop-enter-active, .pop-leave-active { transition: opacity .18s ease, transform .18s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(8px); }
</style>
