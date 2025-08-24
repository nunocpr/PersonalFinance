<script setup lang="ts">
// DashboardLayout.vue
import { onMounted, ref, computed, onBeforeUnmount } from "vue";
import { useAuth } from "@/services/auth/auth.store";
import { useRoute, useRouter } from "vue-router";
import { useAccounts } from "@/services/accounts/accounts.store";
import AccountPicker from "@/components/accounts/AccountPicker.vue";
import Button from "../ui/Button.vue";
import { LayoutDashboard, Landmark, FolderTree, CreditCard, Settings } from "lucide-vue-next";


// ── Sidebar + title mapping ─────────────
const { user, clearSession } = useAuth();
const route = useRoute();
const router = useRouter();

const nav = [
    { name: "Painel", to: { name: "dashboard" }, icon: LayoutDashboard },
    { name: "Contas", to: { name: "accounts" }, icon: Landmark },
    { name: "Categorias", to: { name: "categories" }, icon: FolderTree },
    { name: "Transacções", to: { name: "transactions" }, icon: CreditCard },
    { name: "Regras", to: { name: "rules" }, icon: Settings },
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
const { items: accounts, activeId, setActive, load, loaded } = useAccounts();
onMounted(() => { load(); });

async function doLogout() {
    await clearSession();
    router.replace({ name: "auth-login" });
}

const activeIdModel = computed<number | null>({
    get: () => activeId.value,
    set: (v) => setActive(v),
});

</script>

<template>
    <div
        class="h-screen grid overflow-hidden bg-alabaster text-gray-900 grid-cols-1 md:[grid-template-columns:auto_1fr]">
        <!-- SIDEBAR -->
        <aside :class="[
            'hidden md:grid h-full border-r border-night bg-secondary text-white grid-rows-[auto_1fr_auto] relative transition-[width] duration-200',
            collapsed ? 'w-14' : 'w-64'
        ]">
            <button
                class="absolute z-50 top-1/2 -translate-y-1/2 right-0 translate-x-1/2 h-7 w-7 rounded-full border border-gray-200 shadow bg-secondary hover:bg-secondary-light cursor-pointer"
                :title="collapsed ? 'Expandir barra lateral' : 'Encolher barra lateral'" @click="toggleSidebar"
                aria-label="Alternar barra lateral">
                <span class="inline-block w-full text-center ml-[1px] mb-0.5">{{ collapsed ? "»" : "«" }}</span>
            </button>

            <div
                :class="['border-b border-night flex items-center h-16', collapsed ? 'justify-center px-0' : 'justify-between px-3']">
                <div class="p-2 flex items-center gap-2 font-heading text-xl">
                    <span v-if="!collapsed" class="truncate">Personal Finance</span>
                </div>
                <div v-if="!collapsed" class="w-8"></div>
            </div>

            <nav class="p-2 space-y-1 overflow-y-auto">
                <RouterLink v-for="item in nav" :key="item.name" :to="item.to" :title="item.name"
                    class="flex items-center px-3 py-2 rounded hover:bg-primary hover:text-night"
                    :class="[collapsed ? 'gap-0 justify-center' : 'gap-3', $route.name === item.to.name ? 'bg-primary text-night' : 'text-white/80']">
                    <component :is="item.icon" class="w-5 h-5" aria-hidden="true" />

                    <span class="truncate whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-200"
                        :class="collapsed ? 'max-w-0 opacity-0' : 'max-w-[12rem] opacity-100'">
                        {{ item.name }}
                    </span>
                </RouterLink>
            </nav>

            <div
                :class="['border-t border-gray-50 p-3 text-sm text-gray-700', collapsed ? 'flex flex-col items-center' : '']">
                <Button variant="primary" :size="collapsed ? 'icon' : 'md'" :block="!collapsed" class="hover:bg-red-700"
                    :title="collapsed ? 'Terminar sessão' : undefined" @click="doLogout">
                    <template v-if="collapsed">
                        <!-- or use a Lucide icon: <Power class="w-4 h-4" /> -->
                        ⏻
                    </template>
                    <template v-else>Terminar sessão</template>
                </Button>
            </div>
        </aside>

        <!-- Mobile bottom nav -->
        <nav class="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-night bg-secondary text-white">
            <ul class="grid grid-cols-5">
                <li v-for="item in nav" :key="item.name">
                    <RouterLink :to="item.to" class="flex flex-col items-center justify-center h-14 gap-1"
                        :class="$route.name === item.to.name ? 'text-primary' : 'text-white/80'">
                        <component :is="item.icon" class="w-5 h-5" aria-hidden="true" />
                        <span class="text-[11px] leading-none">{{ item.name }}</span>
                    </RouterLink>
                </li>
            </ul>
        </nav>

        <!-- CONTENT -->
        <section class="min-h-0 flex flex-col md:overflow-hidden">
            <header
                class="border-b bg-primary text-night border-night sticky top-0 z-10 px-4 md:px-12 flex items-center gap-3 md:gap-6 h-16">
                <h1 class="font-heading font-semibold">{{ currentTitle }}</h1>

                <!-- Right cluster: stable & friendly -->
                <div class="ml-auto flex items-center gap-4">
                    <div class="flex items-center gap-4">
                        <AccountPicker :accounts="accounts" v-model="activeIdModel" />
                    </div>
                </div>

                <!-- User dropdown -->
                <div class="relative" ref="menuRef">
                    <button type="button"
                        class="grid place-items-center w-9 h-9 rounded-full bg-secondary text-white hover:bg-secondary-light cursor-pointer transition-colors group data-[open=true]:bg-secondary-light"
                        :data-open="userMenuOpen" @click.stop="toggleUserMenu" aria-haspopup="menu"
                        :aria-expanded="userMenuOpen" title="Abrir menu do utilizador">
                        {{ initial }}
                    </button>

                    <!-- Dropdown panel -->
                    <transition name="fade">
                        <div v-if="userMenuOpen" role="menu"
                            class="fixed md:absolute md:w-[16rem] md:max-w-none md:left-auto inset-0 z-40 top-16 md:top-12 bg-secondary text-white rounded-b md:rounded drop-shadow-lg max-h-[60vh] h-fit">
                            <RouterLink :to="{ name: 'profile' }" role="menuitem"
                                class="block px-4 py-2 text-sm bg-secondary text-white hover:bg-primary hover:text-night transition-colors border-b border-white/40 last:border-0"
                                @click.native="closeUserMenu">
                                Perfil
                            </RouterLink>

                            <div class="p-2 mt-2">
                                <Button variant="primary" size="sm" class="w-full hover:bg-red-700"
                                    title="Terminar sessão" @click="doLogout">
                                    Terminar sessão
                                </Button>
                            </div>
                        </div>
                    </transition>
                </div>

            </header>

            <!-- Main outlet -->
            <main class="flex-1 overflow-auto px-4 py-4 pb-16 md:pb-6 md:px-12">
                <!-- Skeleton while accounts load (prevents layout jumps) -->
                <div v-if="!loaded" class="flex items-center gap-3">
                    <div class="h-6 w-40 bg-secondary text-white rounded animate-pulse"></div>
                    <div class="h-6 w-28 bg-secondary text-white rounded animate-pulse"></div>
                </div>

                <RouterView v-else :key="$route.fullPath" />
            </main>
        </section>
    </div>
</template>
