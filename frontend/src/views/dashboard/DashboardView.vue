<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAccounts } from "@/services/accounts/accounts.store";
import { formatEUR } from "@/utils/money";

const router = useRouter();
const { items, activeId, setActive, load } = useAccounts();

onMounted(() => { load(); });

// Simple label map for account type -> PT-PT
function tipoContaLabel(t: string) {
  switch (t) {
    case "checking":   return "Conta à ordem";
    case "savings":    return "Poupança";
    case "credit":     return "Crédito";
    case "investment": return "Investimento";
    default:           return "Outra";
  }
}

function irParaContas() {
  router.push({ name: "accounts" });
}
</script>

<template>
  <section class="space-y-4">
    <h2 class="text-lg font-heading">Escolha uma conta</h2>

    <div v-if="!items.length" class="rounded border bg-white p-4">
      <p class="mb-3 text-gray-700">Ainda não tens contas criadas.</p>
      <button class="px-3 py-1.5 rounded bg-black text-white" @click="irParaContas">
        Cria a tua primeira conta
      </button>
    </div>

    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <button
        v-for="a in items"
        :key="a.id"
        class="cursor-pointer text-left rounded border bg-white p-3 hover:border-black"
        :class="activeId === a.id ? 'border-black ring-1 ring-black' : ''"
        @click="setActive(a.id)"
      >
        <div class="font-medium">{{ a.name }}</div>
        <div class="text-sm text-gray-600">
          {{ tipoContaLabel(a.type) }} •
          {{ formatEUR(a.balance) }}
        </div>
        <div v-if="a.description" class="text-xs text-gray-500 mt-1">{{ a.description }}</div>
      </button>
    </div>
  </section>
</template>
