<script setup lang="ts">
defineOptions({ name: "AccountsView" });
import AccountsSection from "@/components/accounts/AccountsSection.vue";
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <h1 class="text-xl font-heading">Gerir contas</h1>
        </div>

        <AccountsSection />
    </div>
</template>
