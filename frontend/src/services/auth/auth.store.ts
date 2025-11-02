// src/services/auth/auth.store.ts
import { ref, computed } from "vue";
import { logout } from "./auth.service";

import { useAccounts } from "../accounts/accounts.store";

import client from "../api/client";
import type { UserDto } from "@/types/auth";


const userRef = ref<UserDto | null>(null);
const authedRef = computed(() => !!userRef.value);
const { reset: resetAccounts } = useAccounts();


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
        resetAccounts();
        userRef.value = null;
    }

    return { user: computed(() => userRef.value), authed: authedRef, bootstrapAuth, setSession, clearSession };
}
