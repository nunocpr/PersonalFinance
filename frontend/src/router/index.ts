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
            { path: "login", name: "auth-login", component: () => import("@/views/auth/AuthView.vue") },
            { path: "register", name: "auth-register", component: () => import("@/views/auth/AuthView.vue") },
            { path: "forgot", name: "auth-forgot", component: () => import("@/views/auth/ForgotPasswordView.vue") },
            { path: "verify-email", name: "verify-email", component: () => import("@/views/auth/VerifyEmailView.vue") },
            { path: "", redirect: { name: "auth-login" } },
        ],
    },
    {
        path: "/",
        component: DashboardLayout,
        meta: { requiresAuth: true },
        children: [
            { path: "", name: "dashboard", component: () => import("@/views/dashboard/DashboardView.vue") },
            { path: "profile", name: "profile", component: () => import("@/views/dashboard/ProfileView.vue") },

        ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/auth/login" },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
    const { authed, bootstrapAuth } = useAuth();
    await bootstrapAuth();

    if (to.meta.requiresAuth && !authed.value) {
        if (String(to.name).startsWith("auth-")) return true;
        return { name: "auth-login", replace: true };
    }
    if (to.meta.guestOnly && authed.value) {
        return { name: "dashboard", replace: true };
    }
    return true;
});

export default router;
