<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useAuth } from "@/services/auth/auth.store";
import { useRoute, useRouter } from "vue-router";

const { user, clearSession } = useAuth();
const route = useRoute();
const router = useRouter();

const nav = [
  { name: "Dashboard", to: { name: "dashboard" }, icon: "🏠" },
  { name: "Profile",   to: { name: "profile" },   icon: "👤" },
];

const isActive = (to: any) => route.name === to.name;

// collapse state (persisted)
const SIDEBAR_KEY = "pf_sidebar_collapsed";
const collapsed = ref(false);
onMounted(() => { collapsed.value = localStorage.getItem(SIDEBAR_KEY) === "1"; });
function toggleSidebar() {
  collapsed.value = !collapsed.value;
  localStorage.setItem(SIDEBAR_KEY, collapsed.value ? "1" : "0");
}

// sizes
const HEADER_H = "h-16"; // 64px header for both
const asideWidth = computed(() => (collapsed.value ? "4rem" : "16rem")); // 64 / 256 px

const initial = computed(() =>
  (user?.value?.user_name || user?.value?.user_email || "?").slice(0, 1).toUpperCase()
);
const displayName = computed(() => user?.value?.user_name || user?.value?.user_email);

async function doLogout() {
  await clearSession();
  router.replace({ name: "auth-login" });
}
</script>

<template>
  <!-- Full page grid: [sidebar | content] -->
  <div
    class="h-screen grid overflow-hidden bg-gray-50 text-gray-900"
    style="grid-template-columns: auto 1fr;"
  >
    <!-- Sidebar column -->
    <aside
      class="h-full border-r border-gray-200 bg-white grid grid-rows-[auto_1fr_auto] relative transition-[width] duration-200"
      :style="{ width: asideWidth }"
    >
      <!-- floating toggle on seam -->
      <button
        class="absolute z-20 top-1/2 -translate-y-1/2 -right-3 h-8 w-8 rounded-full border border-gray-200 bg-white shadow hover:bg-gray-50 cursor-pointer"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleSidebar"
        aria-label="Toggle sidebar"
      >
        <span class="inline-block w-full text-center">{{ collapsed ? "»" : "«" }}</span>
      </button>

      <!-- Brand -->
      <div
        :class="[
          'border-b border-gray-200 flex items-center',
          HEADER_H,
          collapsed ? 'justify-center px-0' : 'justify-between px-3'
        ]"
      >
        <div class="flex items-center gap-2 font-heading text-xl">
          <span>💸</span>
          <span v-if="!collapsed" class="truncate">PersonalFinance</span>
        </div>
        <div v-if="!collapsed" class="w-8"></div>
      </div>

      <!-- Nav -->
      <nav class="p-2 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in nav"
          :key="item.name"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100"
          :class="isActive(item.to) ? 'bg-gray-100 font-medium' : ''"
          :title="collapsed ? item.name : undefined"
        >
          <span class="shrink-0">{{ item.icon }}</span>
          <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
        </RouterLink>
      </nav>

      <!-- Footer -->
      <div
        :class="[
          'border-t border-gray-200 p-3 text-sm text-gray-700',
          collapsed ? 'flex flex-col items-center gap-3' : ''
        ]"
      >
        <div class="flex items-center gap-2">
          <div class="grid place-items-center rounded-full bg-gray-200 text-gray-700 w-8 h-8">
            {{ initial }}
          </div>
          <div v-if="!collapsed" class="truncate">{{ displayName }}</div>
        </div>

        <button
          class="mt-3 rounded bg-black text-white py-1.5 text-center w-full cursor-pointer hover:bg-red-700"
          :class="collapsed ? 'w-10 h-8 grid place-items-center p-0' : ''"
          @click="doLogout"
          :title="collapsed ? 'Logout' : undefined"
        >
          <span v-if="!collapsed">Logout</span>
          <span v-else>⏻</span>
        </button>
      </div>
    </aside>

    <!-- Content column -->
    <section class="min-h-0 flex flex-col overflow-hidden">
      <header :class="['bg-white border-b border-gray-200 sticky top-0 z-10 px-12 flex items-center', HEADER_H]">
          <h1 class="font-heading text-lg capitalize">
            {{ String(route.name || '').replace('-', ' ') }}
          </h1>
      </header>

      <!-- Important: flex-1 + overflow-auto so the outlet always renders/scrolls -->
      <main class="flex-1 overflow-auto px-12 py-6">
        <RouterView />
      </main>
    </section>
  </div>
</template>
