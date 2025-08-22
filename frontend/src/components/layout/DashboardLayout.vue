<script setup lang="ts">
import { onMounted, ref, computed, onBeforeUnmount } from "vue";
import { useAuth } from "@/services/auth/auth.store";
import { useRoute, useRouter } from "vue-router";
import { useAccounts } from "@/services/accounts/accounts.store";
import AccountPicker from "@/components/accounts/AccountPicker.vue";


// ── Sidebar + title mapping ─────────────
const { user, clearSession } = useAuth();
const route = useRoute();
const router = useRouter();

const nav = [
    { name: "Painel", to: { name: "dashboard" }, icon: "🏠" },
    { name: "Contas", to: { name: "accounts" }, icon: "🏦" },
    { name: "Categorias", to: { name: "categories" }, icon: "🗂️" },
    { name: "Transacções", to: { name: "transactions" }, icon: "💳" },
    { name: "Regras", to: { name: "rules" }, icon: "⚙️" }
];

const TITLE_MAP = new Map<string, string>(nav.map(i => [String(i.to.name), i.name]));

const currentTitle = computed(() => {
    const name = route.name ? String(route.name) : "";
    if (name && TITLE_MAP.has(name)) return TITLE_MAP.get(name)!;
    for (let i = route.matched.length - 1; i >= 0; i--) {
        const rec = route.matched[i];
        if (rec.meta?.title) return String(rec.meta.title);
        const recName = rec.name ? String(rec.name) : "";
        if (recName && TITLE_MAP.has(recName)) return TITLE_MAP.get(recName)!;
    }
    return name.replaceAll("-", " ");
});

const SIDEBAR_KEY = "pf_sidebar_collapsed";
const collapsed = ref(false);

onMounted(() => { collapsed.value = localStorage.getItem(SIDEBAR_KEY) === "1"; });

function toggleSidebar() {
    collapsed.value = !collapsed.value;
    localStorage.setItem(SIDEBAR_KEY, collapsed.value ? "1" : "0");
}

const asideWidth = computed(() => (collapsed.value ? "4rem" : "16rem"));

// --- user display helpers
const initial = computed(() =>
    (user?.value?.name || user?.value?.email || "?").slice(0, 1).toUpperCase()
);
const displayName = computed(() => user?.value?.name || user?.value?.email || "");
const firstName = computed(() => (displayName.value.split(" ")[0] || displayName.value));

// --- user dropdown state
const userMenuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

function toggleUserMenu() { userMenuOpen.value = !userMenuOpen.value; }
function closeUserMenu() { userMenuOpen.value = false; }

// click-outside to close
function onDocClick(e: MouseEvent) {
    if (!userMenuOpen.value) return;
    const el = menuRef.value;
    if (el && !el.contains(e.target as Node)) closeUserMenu();
}
onMounted(() => document.addEventListener("click", onDocClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocClick));

// ── Accounts in header ──────────────────────────────────────
const { items: accounts, activeId, load, loaded } = useAccounts();
onMounted(() => { load(); });

async function doLogout() {
    await clearSession();
    router.replace({ name: "auth-login" });
}
</script>

<template>
    <div class="h-screen grid overflow-hidden bg-gray-50 text-gray-900" style="grid-template-columns: auto 1fr;">
        <!-- ASIDE (unchanged except text) -->
        <aside
            class="h-full border-r border-gray-200 bg-white grid grid-rows-[auto_1fr_auto] relative transition-[width] duration-200"
            :style="{ width: asideWidth }">
            <button
                class="absolute z-20 top-1/2 -translate-y-1/2 -right-3 h-8 w-8 rounded-full border border-gray-200 bg-white shadow hover:bg-gray-50 cursor-pointer"
                :title="collapsed ? 'Expandir barra lateral' : 'Encolher barra lateral'" @click="toggleSidebar"
                aria-label="Alternar barra lateral">
                <span class="inline-block w-full text-center">{{ collapsed ? "»" : "«" }}</span>
            </button>

            <div
                :class="['border-b border-gray-200 flex items-center h-16', collapsed ? 'justify-center px-0' : 'justify-between px-3']">
                <div class="flex items-center gap-2 font-heading text-xl">
                    <span>💸</span>
                    <span v-if="!collapsed" class="truncate">PersonalFinance</span>
                </div>
                <div v-if="!collapsed" class="w-8"></div>
            </div>

            <nav class="p-2 space-y-1 overflow-y-auto">
                <RouterLink v-for="item in nav" :key="item.name" :to="item.to"
                    class="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100"
                    :class="$route.name === item.to.name ? 'bg-gray-200 font-medium' : ''"
                    :title="collapsed ? item.name : undefined">
                    <span class="shrink-0">{{ item.icon }}</span>
                    <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
                </RouterLink>
            </nav>

            <div
                :class="['border-t border-gray-200 p-3 text-sm text-gray-700', collapsed ? 'flex flex-col items-center' : '']">
                <button
                    class="mt-3 rounded bg-black text-white py-1.5 text-center w-full cursor-pointer hover:bg-red-700"
                    :class="collapsed ? 'w-10 h-8 grid place-items-center p-0' : ''" @click="doLogout"
                    :title="collapsed ? 'Terminar sessão' : undefined">
                    <span v-if="!collapsed">Terminar sessão</span>
                    <span v-else>⏻</span>
                </button>
            </div>
        </aside>

        <!-- CONTENT -->
        <section class="min-h-0 flex flex-col overflow-hidden">
            <header class="bg-white border-b border-gray-200 sticky top-0 z-10 px-12 flex items-center gap-6 h-16">
                <h1 class="font-heading text-lg">{{ currentTitle }}</h1>

                <!-- Right cluster: stable & friendly -->
                <div class="ml-auto flex items-center gap-4">
                    <div class="flex items-center gap-4">
                        <AccountPicker :accounts="accounts" v-model="activeId" />
                    </div>

                    <RouterLink v-if="loaded && !accounts.length" class="text-sm underline text-gray-700"
                        :to="{ name: 'accounts' }">Criar conta</RouterLink>
                </div>
                <!-- User dropdown -->
                <div class="relative" ref="menuRef">
                    <button type="button"
                        class="grid place-items-center w-9 h-9 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
                        @click.stop="toggleUserMenu" aria-haspopup="menu" :aria-expanded="userMenuOpen"
                        title="Abrir menu do utilizador">
                        {{ initial }}
                    </button>

                    <!-- Dropdown panel -->
                    <transition name="fade">
                        <div v-if="userMenuOpen"
                            class="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                            role="menu">
                            <div class="px-4 py-3 border-b border-gray-100">
                                <div class="mt-2 text-sm text-gray-600">Olá, <span class="font-medium">{{ firstName
                                        }}</span></div>
                            </div>

                            <div class="py-1">
                                <RouterLink :to="{ name: 'profile' }" class="block px-4 py-2 text-sm hover:bg-gray-50"
                                    role="menuitem" @click.native="closeUserMenu">
                                    Perfil
                                </RouterLink>
                            </div>
                        </div>
                    </transition>
                </div>
            </header>

            <!-- Main outlet -->
            <main class="flex-1 overflow-auto px-12 py-6">
                <!-- Skeleton while accounts load (prevents layout jumps) -->
                <div v-if="!loaded" class="flex items-center gap-3">
                    <div class="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
                    <div class="h-6 w-28 bg-gray-200 rounded animate-pulse"></div>
                </div>

                <RouterView v-else :key="$route.fullPath" />
            </main>
        </section>
    </div>
</template>
