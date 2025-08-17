// src/services/auth/auth.store.ts
import { ref, computed } from "vue";
import { getMe, logout } from "./auth.service";
import type { UserDto } from "@/types/auth";
import client from "../api/client";

const userRef = ref<UserDto | null>(null);
const authedRef = computed(() => !!userRef.value);

export function useAuth() {
    function setSession(u: UserDto) { userRef.value = u; }

    async function bootstrapAuth() {
        try {
            const { data } = await client.get("/auth/me");
            setSession(data.user);
        } catch {
            try {
                await client.post("/auth/refresh", {});
                const { data } = await client.get("/auth/me");
                setSession(data.user);
            } catch {
                clearSession();
            }
        }
    }

    async function clearSession(opts: { remote?: boolean } = {}) {
        // default remote=false; call backend logout only when explicitly asked
        const remote = opts.remote ?? false;
        if (remote) { try { await logout(); } catch { /* ignore */ } }
        userRef.value = null;
        // no localStorage writes since you moved to cookies
    }

    return { user: computed(() => userRef.value), authed: authedRef, bootstrapAuth, setSession, clearSession };
}
