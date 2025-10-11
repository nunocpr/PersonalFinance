import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
    const isDev = mode === "development";

    return {
        base: isDev ? "/" : "/PersonalFinance/",

        plugins: [vue()],

        server: isDev
            ? {
                host: "localhost",
                port: 5173,
                https: {
                    key: fs.readFileSync(path.resolve(__dirname, "../certs/localhost-key.pem")),
                    cert: fs.readFileSync(path.resolve(__dirname, "../certs/localhost.pem")),
                },
            }
            : undefined,

        resolve: {
            alias: { "@": path.resolve(__dirname, "./src") },
        },
    };
});
