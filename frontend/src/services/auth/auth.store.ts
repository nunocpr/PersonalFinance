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

    async function clearSession() {
        try { await logout(); } catch { }
        userRef.value = null;
    }

    return { user: computed(() => userRef.value), authed: authedRef, bootstrapAuth, setSession, clearSession };
}
