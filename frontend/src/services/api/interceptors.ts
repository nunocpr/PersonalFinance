// src/services/api/interceptors.ts
import client from "./client";
import type { Router } from "vue-router";

let isRefreshing = false;
let waiters: ((ok: boolean) => void)[] = [];

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
        r => r,
        async (error) => {
            const { response, config } = error || {};
            if (!response || !config) throw error;

            // Skip refresh logic on guest routes (login/register/verify-email/etc)
            if (isGuestRoute()) throw error;

            // Only try refresh on 401s for non-refresh, non-auth endpoints
            if (response.status === 401 && !config._retry && !isAuthApi(config.url)) {
                (config as any)._retry = true;

                if (!isRefreshing) {
                    isRefreshing = true;
                    try {
                        await client.post("/auth/refresh");
                        hooks.onRefreshOk();
                        waiters.forEach(fn => fn(true));
                    } catch {
                        hooks.onRefreshFail();
                        waiters.forEach(fn => fn(false));
                    } finally {
                        waiters = [];
                        isRefreshing = false;
                    }
                }

                const ok = await new Promise<boolean>(resolve => waiters.push(resolve));
                if (ok) return client(config);
            }

            throw error;
        }
    );
}
