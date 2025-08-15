<script setup lang="ts">
import { reactive, watch } from "vue";
import type { Account, AccountType } from "@/types/accounts";

const props = defineProps<{
  open: boolean;
  mode: "create" | "edit";
  value?: Account | null;
}>();

const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "save", payload: { name: string; type: AccountType; balance: number; description: string | null }): void;
}>();

const form = reactive<{
  name: string;
  type: AccountType;
  balance: number;
  description: string | null;
}>({
  name: "",
  type: "checking",
  balance: 0,
  description: "",
});

watch(() => props.value, (val) => {
  if (props.mode === "edit" && val) {
    form.name = val.name;
    form.type = val.type;
    form.balance = val.balance;
    form.description = val.description ?? "";
  } else if (props.mode === "create") {
    form.name = "";
    form.type = "checking";
    form.balance = 0;
    form.description = "";
  }
}, { immediate: true });

function close() {
  emit("update:open", false);
}

function submit() {
  emit("save", {
    name: form.name.trim(),
    type: form.type,
    balance: Number(form.balance) || 0,
    description: form.description?.trim() || null,
  });
}
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[9999] grid place-items-center bg-black/40">
      <div class="bg-white rounded-xl w-full max-w-md p-5 space-y-4 shadow-xl">
        <h2 class="text-lg font-heading">{{ mode === "create" ? "Add account" : "Edit account" }}</h2>

        <div class="space-y-3">
          <label class="block">
            <div class="text-sm text-gray-600 mb-1">Name</div>
            <input class="w-full border rounded px-3 py-2" v-model="form.name" />
          </label>

          <label class="block">
            <div class="text-sm text-gray-600 mb-1">Type</div>
            <select class="w-full border rounded px-3 py-2" v-model="form.type">
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit</option>
              <option value="investment">Investment</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label class="block">
            <div class="text-sm text-gray-600 mb-1">Balance</div>
            <input type="number" step="0.01" class="w-full border rounded px-3 py-2" v-model.number="form.balance" />
          </label>

          <label class="block">
            <div class="text-sm text-gray-600 mb-1">Description</div>
            <input class="w-full border rounded px-3 py-2" v-model="form.description" />
          </label>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="px-3 py-1.5 rounded border cursor-pointer" @click="close">Cancel</button>
          <button type="button" class="px-3 py-1.5 rounded bg-black text-white cursor-pointer" @click="submit">Save</button>
        </div>
      </div>
    </div>
  </teleport>
</template>
