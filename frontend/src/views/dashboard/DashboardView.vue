<script setup lang="ts">
defineOptions({ name: "DashboardView" });

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
        case "checking": return "Conta à ordem";
        case "savings": return "Poupança";
        case "credit": return "Crédito";
        case "investment": return "Investimento";
        default: return "Outra";
    }
}

function irParaContas() {
    router.push({ name: "accounts" });
}
</script>

<template>
    <section class="space-y-6">

    </section>
</template>
