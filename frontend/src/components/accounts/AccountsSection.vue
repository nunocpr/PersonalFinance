<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAccounts } from "@/services/accounts/accounts.store";
import AccountModal from "./AccountModal.vue";
import type { Account } from "@/types/accounts";

const { items, load, add, edit, remove } = useAccounts();

const show = ref(false);
const mode = ref<"create" | "edit">("create");
const current = ref<Account | null>(null);

onMounted(() => { load(); });

function openCreate() {
  mode.value = "create";
  current.value = null;
  show.value = true;
}

function openEdit(a: Account) {
  mode.value = "edit";
  current.value = a;
  show.value = true;
}

async function onSave(payload: any) {
  if (mode.value === "create") await add(payload);
  else if (current.value) await edit(current.value.id, payload);
  show.value = false;
}

async function onDelete(a: Account) {
  if (confirm(`Delete account "${a.name}"? This cannot be undone.`)) {
    await remove(a.id);
  }
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-heading">Accounts</h2>
      <button
        type="button"
        class="cursor-pointer px-3 py-1.5 rounded bg-black text-white"
        @click="openCreate"
      >
        Add
      </button>
    </div>

    <div class="grid gap-3">
      <div
        v-for="a in items"
        :key="a.id"
        class="rounded border bg-white p-3 flex items-center justify-between"
      >
        <div>
          <div class="font-medium">{{ a.name }}</div>
          <div class="text-sm text-gray-600">
            {{ a.type }} • {{ a.balance.toFixed(2) }}
          </div>
          <div v-if="a.description" class="text-xs text-gray-500 mt-1">{{ a.description }}</div>
        </div>
        <div class="flex gap-2">
          <button type="button" class="cursor-pointer px-2 py-1 rounded border" @click="openEdit(a)">Edit</button>
          <button type="button" class="cursor-pointer px-2 py-1 rounded bg-red-600 text-white" @click="onDelete(a)">Delete</button>
        </div>
      </div>

      <p v-if="!items.length" class="text-sm text-gray-600">No accounts yet. Create your first one.</p>
    </div>

    <AccountModal
      v-model:open="show"
      :mode="mode"
      :value="current"
      @save="onSave"
    />
  </section>
</template>
