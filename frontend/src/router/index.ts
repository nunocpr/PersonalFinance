import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "@/services/auth/auth.store";

const AuthLayout = () => import("@/components/layout/AuthLayout.vue");
const DashboardLayout = () => import("@/components/layout/DashboardLayout.vue");

const routes = [
    {
        path: "/auth",
        component: AuthLayout,
        meta: { guestOnly: true },
        children: [
            { path: "login", name: "auth-login", meta: { guestOnly: true }, component: () => import("@/views/auth/AuthView.vue") },
            { path: "register", name: "auth-register", meta: { guestOnly: true }, component: () => import("@/views/auth/AuthView.vue") },
            { path: "forgot", name: "auth-forgot", meta: { guestOnly: true }, component: () => import("@/views/auth/ForgotPasswordView.vue") },
            { path: "", redirect: { name: "auth-login" } },
        ],
    },
    { path: "/verify-email", name: "verify-email", meta: { guestOnly: true }, component: () => import("@/views/auth/VerifyEmailView.vue") },
    {
        path: "/",
        component: DashboardLayout,
        meta: { requiresAuth: true },
        children: [
            { path: "", name: "dashboard", component: () => import("@/views/dashboard/DashboardView.vue"), meta: { title: "Painel" } },
            { path: "accounts", name: "accounts", component: () => import("@/views/dashboard/AccountsView.vue"), meta: { title: "Contas" } },
            { path: "profile", name: "profile", component: () => import("@/views/dashboard/ProfileView.vue"), meta: { title: "Perfil" } },
            { path: "categories", name: "categories", component: () => import("@/views/dashboard/CategoriesView.vue"), meta: { title: "Categorias" } },
        ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/auth/login" },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
    const { authed, bootstrapAuth } = useAuth();

    if (to.matched.some(r => r.meta?.guestOnly)) {
        return true;
    }

    await bootstrapAuth();

    if (to.matched.some(r => r.meta?.requiresAuth) && !authed.value) {
        return { name: "auth-login", replace: true };
    }
    return true;
});

export default router;