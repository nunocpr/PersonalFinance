import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useAuth } from "@/services/auth/auth.store";

const routes: RouteRecordRaw[] = [
    // PUBLIC (auth) ------------------------------------------------------------
    {
        path: "/auth",
        children: [
            { path: "login", name: "login", component: () => import("@/views/auth/AuthView.vue") },
            { path: "forgot-password", name: "forgot-password", component: () => import("@/views/auth/ForgotPasswordView.vue") },
            { path: "reset-password", name: "reset-password", component: () => import("@/views/auth/ResetPasswordView.vue") },
            { path: "verify-email", name: "verify-email", component: () => import("@/views/auth/VerifyEmailView.vue") },
            { path: "", redirect: { name: "login" } },
        ],
    },

    // PRIVATE (dashboard) ------------------------------------------------------
    {
        path: "/",
        component: () => import("@/components/layout/DashboardLayout.vue"),
        meta: { requiresAuth: true },
        children: [
            { path: "", name: "dashboard", component: () => import("@/views/dashboard/HomeView.vue") },
            { path: "profile", name: "profile", component: () => import("@/views/dashboard/ProfileView.vue") },
            // { path: "accounts", name: "accounts", component: () => import("@/views/dashboard/AccountsView.vue") },
            // { path: "transactions", name: "transactions", component: () => import("@/views/dashboard/TransactionsView.vue") },
        ],
    },

    { path: "/:pathMatch(.*)*", redirect: "/auth/login" },
];

const router = createRouter({ history: createWebHistory(), routes });

// Guard: bootstrap once, then gate by auth
let didBootstrap = false;
router.beforeEach(async (to) => {
    const { authed, bootstrapAuth } = useAuth();

    if (!didBootstrap) {
        didBootstrap = true;
        await bootstrapAuth(); // calls /auth/me if token exists
    }

    const isAuthRoute = to.path.startsWith("/auth");

    if (to.meta.requiresAuth && !authed.value) {
        return { name: "login", query: { next: to.fullPath } };
    }
    if (isAuthRoute && authed.value) {
        return { name: "dashboard" };
    }
    return true;
});

export default router;
