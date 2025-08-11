// src/services/api/interceptors.ts
import client from "./client";

let isRefreshing = false;
let waiters: ((ok: boolean) => void)[] = [];

type Hooks = { onRefreshOk: () => void; onRefreshFail: () => void };

export function setupInterceptors(hooks: Hooks) {
    client.interceptors.response.use(
        r => r,
        async (error) => {
            const { response, config } = error || {};
            if (!response || !config) throw error;

            // if we're already on /auth/*, don’t try to refresh – just let it 401
            const onAuthRoute = window.location.pathname.startsWith("/auth/");
            if (onAuthRoute) throw error;

            // only handle 401 for non-refresh endpoints
            if (response.status === 401 && !config._retry && !config.url?.includes("/auth/refresh")) {
                (config as any)._retry = true;

                if (!isRefreshing) {
                    isRefreshing = true;
                    try {
                        await client.post("/auth/refresh");
                        hooks.onRefreshOk();
                        waiters.forEach(fn => fn(true));
                    } catch {
                        hooks.onRefreshFail(); // local-only cleanup; no backend logout
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
