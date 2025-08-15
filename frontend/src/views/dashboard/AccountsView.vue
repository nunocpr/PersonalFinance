<script setup lang="ts">
import AccountsSection from "@/components/accounts/AccountsSection.vue";
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-heading">Manage Accounts</h1>
      <RouterLink class="underline" :to="{ name: 'dashboard' }">Back to Dashboard</RouterLink>
    </div>

    <AccountsSection />
  </div>
</template>
