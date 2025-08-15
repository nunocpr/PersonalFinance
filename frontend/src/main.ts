// src/main.ts
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./style.css";

import { setupInterceptors } from "@/services/api/interceptors";
import { useAuth } from "@/services/auth/auth.store";

const app = createApp(App);
const auth = useAuth();

setupInterceptors(
    {
        onRefreshOk: () => { },
        onRefreshFail: () => {
            auth.clearSession({ remote: false });
        }
    },
    router
);

app.use(router);
app.mount("#app");
