// src/services/auth.store.ts
import { ref, computed } from "vue";
import { getUser as _getUser, setUser as _setUser, getToken, logout } from "./auth.service";
import { getMe } from "./auth.service";

const userRef = ref(_getUser());
const authedRef = ref(!!getToken());
const bootstrapped = ref(false);

export function useAuth() {
    async function bootstrapAuth() {
        if (bootstrapped.value) return;
        bootstrapped.value = true;
        if (!getToken()) { userRef.value = null; authedRef.value = false; return; }
        try {
            const u = await getMe();
            userRef.value = u; authedRef.value = true;
            _setUser(u);
        } catch {
            // token invalid (deleted user / expired / disabled)
            logout();
            userRef.value = null; authedRef.value = false;
        }
    }
    function setSession(u: any) { userRef.value = u; authedRef.value = true; _setUser(u); }
    function clearSession() { logout(); userRef.value = null; authedRef.value = false; }

    return {
        user: computed(() => userRef.value),
        authed: computed(() => authedRef.value),
        bootstrapAuth,
        setSession,
        clearSession,
    };
}
