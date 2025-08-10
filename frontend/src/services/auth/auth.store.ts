import { ref, computed } from "vue";
import { getUser, isAuthed, logout as _logout } from "./auth.service";

const user = ref(getUser());
const authed = ref(isAuthed());

export function useAuth() {
    function setSession(u: any) { user.value = u; authed.value = true; }
    function clearSession() { _logout(); user.value = null; authed.value = false; }

    return {
        user: computed(() => user.value),
        authed: computed(() => authed.value),
        setSession,
        clearSession,
    };
}
