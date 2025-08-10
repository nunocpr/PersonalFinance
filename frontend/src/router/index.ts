import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { isAuthed } from "@/services/auth/auth.service";

const routes: RouteRecordRaw[] = [
    { path: "/login", name: "login", component: () => import("@/views/AuthView.vue") },
    { path: "/verify-email", name: "verify-email", component: () => import("@/views/VerifyEmailView.vue") },
    { path: "/forgot-password", name: "forgot-password", component: () => import("@/views/ForgotPasswordView.vue") },
    { path: "/reset-password", name: "reset-password", component: () => import("@/views/ResetPasswordView.vue") },
    { path: "/", name: "dashboard", component: () => import("@/views/DashboardView.vue"), meta: { requiresAuth: true } },
    { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to) => {
    const authed = isAuthed();
    if (to.meta.requiresAuth && !authed) return { name: "login" };
    if (to.name === "login" && authed) return { name: "dashboard" };
    return true;
});

export default router;
