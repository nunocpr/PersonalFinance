import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { useAuth } from "@/services/auth/auth.store";

const routes: RouteRecordRaw[] = [
    { path: "/login", name: "login", component: () => import("@/views/AuthView.vue") },
    { path: "/verify-email", name: "verify-email", component: () => import("@/views/VerifyEmailView.vue") },
    { path: "/forgot-password", name: "forgot-password", component: () => import("@/views/ForgotPasswordView.vue") },
    { path: "/reset-password", name: "reset-password", component: () => import("@/views/ResetPasswordView.vue") },
    { path: "/", name: "dashboard", component: () => import("@/views/DashboardView.vue"), meta: { requiresAuth: true } },
    { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({ history: createWebHistory(), routes });

let didBootstrap = false;
router.beforeEach(async (to) => {
    const { authed, bootstrapAuth } = useAuth();

    if (!didBootstrap) {
        didBootstrap = true;
        await bootstrapAuth(); // checks /auth/me if token exists
    }

    if (to.meta.requiresAuth && !authed.value) return { name: "login" };
    if (to.name === "login" && authed.value) return { name: "dashboard" };
    return true;
});

export default router;
