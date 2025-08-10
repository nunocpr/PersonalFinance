<script setup lang="ts">
import { useAuth } from "@/services/auth/auth.store";
import { useRoute } from "vue-router";

const { user, clearSession } = useAuth();
const route = useRoute();

const nav = [
  { name: "Dashboard",   to: { name: "dashboard" },    icon: "🏠" },
  { name: "Accounts",    to: { name: "accounts" },     icon: "💼" },
  { name: "Transactions",to: { name: "transactions" }, icon: "📄" },
  { name: "Profile",     to: { name: "profile" },      icon: "👤" },
];

function isActive(to: any) {
  return route.name === to.name;
}
</script>

<template>
  <div class="min-h-screen flex bg-gray-50">
    <!-- Sidebar -->
    <aside class="w-64 bg-white border-r">
      <div class="px-4 py-4 border-b">
        <div class="font-heading text-xl">💸 PersonalFinance</div>
      </div>
      <nav class="p-2 space-y-1">
        <RouterLink
          v-for="item in nav"
          :key="item.name"
          :to="item.to"
          class="block px-3 py-2 rounded hover:bg-gray-100"
          :class="isActive(item.to) ? 'bg-gray-100 font-medium' : ''"
        >
          <span class="mr-2">{{ item.icon }}</span>{{ item.name }}
        </RouterLink>
      </nav>
      <div class="mt-auto p-4 text-sm text-gray-600 border-t">
        <div class="mb-2 truncate">
          {{ user?.user_name || user?.user_email }}
        </div>
        <button class="px-3 py-1 rounded bg-black text-white pointer" @click="clearSession()">
          Logout
        </button>
      </div>
    </aside>

    <!-- Content (outlet) -->
    <div class="flex-1 flex flex-col">
      <header class="bg-white border-b">
        <div class="max-w-6xl mx-auto px-6 py-3">
          <slot name="header">
            <h1 class="font-heading text-lg capitalize">
              {{ (route.name as string)?.replace('-', ' ') }}
            </h1>
          </slot>
        </div>
      </header>
      <main class="max-w-6xl mx-auto w-full px-6 py-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
