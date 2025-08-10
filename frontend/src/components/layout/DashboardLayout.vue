<script setup lang="ts">
import { useRedirectOnLogout } from "@/composables/useRedirectOnLogout";
import { useAuth } from "@/services/auth/auth.store";
const { user, clearSession } = useAuth();

useRedirectOnLogout();

function logoutAndRedirect() {
  clearSession();
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b">
      <div class="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <h1 class="font-heading text-xl">PersonalFinance</h1>
        <nav class="flex items-center gap-4">
          <router-link class="hover:underline" to="/">Dashboard</router-link>
          <router-link class="hover:underline" to="/profile">Profile</router-link>
          <div class="text-sm text-gray-600">Hi, {{ user?.user_name || user?.user_email }}</div>
            <button class="px-3 py-1 rounded bg-black text-white" @click="logoutAndRedirect">
                Logout
            </button>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-6">
      <router-view />
    </main>
  </div>
</template>
