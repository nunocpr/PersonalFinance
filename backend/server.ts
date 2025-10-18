// server.ts
import app from "./app";

// Trust upstream proxy (so x-forwarded-proto works behind Koyeb/NGINX/etc.)
app.set("trust proxy", 1);

// Health must NEVER redirect — place before any redirect middleware
app.get("/health", (_req, res) => res.status(200).send("ok"));

const NODE_ENV = process.env.NODE_ENV ?? "development";

// One port var for the app in *both* environments.
// In dev this is your local HTTPS port (3443).
// In prod (Koyeb) set PORT=8000 in the service env.
const APP_PORT = Number(process.env.PORT ?? 3443);

if (NODE_ENV === "production") {
    // Force HTTPS in production, but allow /health
    app.use((req, res, next) => {
        if (req.path === "/health") return next();
        const proto =
            (req.headers["x-forwarded-proto"] as string) ||
            (req.secure ? "https" : "http");
        if (proto !== "https") {
            return res.redirect(308, `https://${req.headers.host}${req.url}`);
        }
        next();
    });

    app.listen(APP_PORT, "0.0.0.0", () => {
        console.log(`🚀 Server listening on port ${APP_PORT} (prod)`);
    });
} else {
    // ---- Local development ----
    try {
        // Try HTTPS if certs exist; fall back to plain HTTP
        const fs = require("fs");
        const http = require("http");
        const https = require("https");

        const httpsOptions = {
            key: fs.readFileSync("../certs/localhost-key.pem"),
            cert: fs.readFileSync("../certs/localhost.pem"),
        };

        // Redirect plain HTTP → HTTPS locally (skip /health)
        app.use((req, res, next) => {
            if (req.secure || req.path === "/health") return next();
            const host = (req.headers.host || "").replace(/:\d+$/, "");
            return res.redirect(308, `https://${host}:${APP_PORT}${req.url}`);
        });

        https.createServer(httpsOptions, app).listen(APP_PORT, "0.0.0.0", () => {
            console.log(`🔒 HTTPS dev server: https://localhost:${APP_PORT}`);
        });

        http.createServer((req: any, res: any) => {
            const host = (req.headers.host || "").replace(/:\d+$/, "");
            res.writeHead(308, { Location: `https://${host}:${APP_PORT}${req.url}` });
            res.end();
        }).listen(APP_PORT, "0.0.0.0", () => {
            console.log(`↪ HTTP redirector:  http://localhost:${APP_PORT} → HTTPS`);
        });
    } catch {
        // No certs → simple HTTP server in dev
        app.listen(APP_PORT, "0.0.0.0", () => {
            console.log(`🟢 Dev HTTP server: http://localhost:${APP_PORT}`);
            console.log("Tip: add ../certs/localhost.pem & localhost-key.pem for local HTTPS.");
        });
    }
}
