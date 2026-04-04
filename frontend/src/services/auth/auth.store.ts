// src/services/auth/auth.store.ts
import { ref, computed } from "vue";
import { logout } from "./auth.service";

import { useAccounts } from "../accounts/accounts.store";

import client from "../api/client";
import type { UserDto } from "@/types/auth";


const userRef = ref<UserDto | null>(null);
const authedRef = computed(() => !!userRef.value);
let bootstrapPromise: Promise<void> | null = null;
const { reset: resetAccounts } = useAccounts();


export function useAuth() {
    function setSession(u: UserDto) { userRef.value = u; }

    async function bootstrapAuth() {
        if (userRef.value) return;
        if (bootstrapPromise) return bootstrapPromise;

        bootstrapPromise = (async () => {
            try {
                const { data } = await client.get("/auth/me");
                setSession(data.user);
            } catch {
                try {
                    await client.post("/auth/refresh", {});
                    const { data } = await client.get("/auth/me");
                    setSession(data.user);
                } catch {
                    await clearSession({ remote: false });
                }
            }
        })();

        try {
            await bootstrapPromise;
        } finally {
            bootstrapPromise = null;
        }
    }

    async function clearSession(options?: { remote?: boolean }) {
        if (options?.remote !== false) {
            try { await logout(); } catch { }
        }
        resetAccounts();
        userRef.value = null;
    }

    return { user: computed(() => userRef.value), authed: authedRef, bootstrapAuth, setSession, clearSession };
}
