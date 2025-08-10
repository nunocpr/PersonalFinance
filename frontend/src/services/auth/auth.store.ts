import { ref, computed } from "vue";
import { getMe, logout } from "./auth.service";
import type { UserDto } from "@/types/auth";

const userRef = ref<UserDto | null>(null);
const authedRef = computed(() => !!userRef.value);
const bootstrapped = ref(false);

export function useAuth() {
    async function bootstrapAuth() {
        if (bootstrapped.value) return;
        bootstrapped.value = true;
        try {
            userRef.value = await getMe();
        } catch {
            userRef.value = null;
        }
    }
    function setSession(u: UserDto) { userRef.value = u; }
    async function clearSession() { await logout(); userRef.value = null; }

    return {
        user: computed(() => userRef.value),
        authed: authedRef,
        bootstrapAuth,
        setSession,
        clearSession,
    };
}
