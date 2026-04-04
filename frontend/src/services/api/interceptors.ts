// src/services/api/interceptors.ts
import client from "./client";
import type { Router } from "vue-router";

let isRefreshing: Promise<void> | null = null;

type Hooks = { onRefreshOk: () => void; onRefreshFail: () => void };

export function setupInterceptors(hooks: Hooks, router?: Router) {
    const isGuestRoute = () => {
        const r = router?.currentRoute.value;
        if (!r) return false;
        return r.matched.some(rec => rec.meta?.guestOnly === true);
    };

    const isRefreshApi = (url?: string) => Boolean(url && url.startsWith("/auth/refresh"));

    client.interceptors.response.use(
        (res) => res,
        async (err) => {
            const original = err.config;
            if (
                err?.response?.status === 401 &&
                original &&
                !original._retry &&
                !isRefreshApi(original.url)
            ) {
                original._retry = true;
                try {
                    isRefreshing ??= client.post(
                        "/auth/refresh",
                        {},
                        { withCredentials: true }
                    ).then(() => {
                        hooks.onRefreshOk();
                    }).finally(() => { isRefreshing = null; });
                    await isRefreshing;
                    return client(original);
                } catch {
                    hooks.onRefreshFail();
                    if (!isGuestRoute()) {
                        void router?.replace({ name: "auth-login" });
                    }
                }
            }
            return Promise.reject(err);
        }
    );

}
