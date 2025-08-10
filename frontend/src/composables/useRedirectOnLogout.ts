import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/services/auth/auth.store";

type Options = {
    to?: { name?: string; path?: string }; // where to go
    replace?: boolean;                      // replace history instead of push
    checkOnMounted?: boolean;               // also check immediately on mount
};

export function useRedirectOnLogout(options: Options = {}) {
    const {
        to = { name: "login" },
        replace = true,
        checkOnMounted = true,
    } = options;

    const { authed } = useAuth();
    const router = useRouter();

    // Redirect helper
    const go = () => (replace ? router.replace(to) : router.push(to));

    // If already logged out when this component mounts, redirect now
    if (checkOnMounted) {
        onMounted(() => {
            if (!authed.value) go();
        });
    }

    // React to future logout events
    const stop = watch(authed, (isAuthed) => {
        if (!isAuthed) go();
    });

    // Return a way to stop the watcher if you ever need it
    return { stop };
}
