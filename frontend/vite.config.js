import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    return {
        plugins: [vue()],
        server: {
            host: "localhost",
            port: 5173,
            https: {
                key: fs.readFileSync(path.resolve(__dirname, "../certs/localhost-key.pem")),
                cert: fs.readFileSync(path.resolve(__dirname, "../certs/localhost.pem")),
            },
        },
        resolve: {
            alias: { "@": path.resolve(__dirname, "./src") },
        },
    };
});
