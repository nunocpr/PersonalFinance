import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { installInterceptors } from "./services/api/interceptors";
import './style.css'

installInterceptors();

createApp(App).use(router).mount("#app");
