// src/services/api/interceptors.ts
import axios from "axios";
import client from "./client";
import type { Router } from "vue-router";

let isRefreshing: Promise<void> | null = null;

type Hooks = { onRefreshOk: () => void; onRefreshFail: () => void };

export function setupInterceptors(hooks: Hooks, router?: Router) {
    const isGuestRoute = () => {
        const r = router?.currentRoute.value;
        if (!r) return false;
        // any matched record with guestOnly meta
        return r.matched.some(rec => rec.meta?.guestOnly === true);
    };

    const isAuthApi = (url?: string) => Boolean(url && url.startsWith("/auth/"));

    client.interceptors.response.use(
        (res) => res,
        async (err) => {
            const original = err.config;
            if (err?.response?.status === 401 && !original._retry) {
                original._retry = true;
                try {
                    isRefreshing ??= axios.post(
                        "/auth/refresh",
                        { withCredentials: true }
                    ).then(() => { /* ok */ }).finally(() => { isRefreshing = null; });
                    await isRefreshing;
                } catch {
                    // fall through → let the store redirect to login
                }
            }
            return Promise.reject(err);
        }
    );

}
