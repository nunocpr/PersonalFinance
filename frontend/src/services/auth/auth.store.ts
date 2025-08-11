// src/services/auth/auth.store.ts
import { ref, computed } from "vue";
import { getMe, logout } from "./auth.service";
import type { UserDto } from "@/types/auth";

const userRef = ref<UserDto | null>(null);
const authedRef = computed(() => !!userRef.value);
let bootstrapOnce: Promise<void> | null = null;

export function useAuth() {
    function setSession(u: UserDto) { userRef.value = u; }

    async function bootstrapAuth() {
        if (bootstrapOnce) return bootstrapOnce;
        bootstrapOnce = (async () => {
            try { userRef.value = await getMe(); } catch { userRef.value = null; }
        })();
        return bootstrapOnce;
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
