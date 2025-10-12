// server.ts
import app from "./app";
import config from "./config/config";

// Trust upstream proxy (needed for x-forwarded-proto)
app.set("trust proxy", 1);

// Health first
app.get("/health", (_req, res) => res.status(200).send("ok"));

const platformPort = process.env.PORT;
const isProd = process.env.NODE_ENV === "production" || !!platformPort;

if (isProd) {
    // On Koyeb/Render/etc. always bind to the platform port
    const PORT = Number(platformPort || 8000);

    // Enforce HTTPS (skip /health)
    app.use((req, res, next) => {

        if (req.path === "/health") return next();

        const proto =
            (req.headers["x-forwarded-proto"] as string) ||
            (req.secure ? "https" : "http");

        if (proto !== "https") {
            // 308 preserves method and body on redirect
            return res.redirect(308, `https://${req.headers.host}${req.url}`);
        }

        next();
    });

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server listening on port ${PORT} (prod)`);
    });
} else {
    // ---- Local development ----
    try {
        const fs = require("fs");
        const http = require("http");
        const https = require("https");

        const DEV_HTTPS_PORT = Number(process.env.DEV_HTTPS_PORT || config.PORT || 3443);
        const DEV_HTTP_PORT = Number(process.env.DEV_HTTP_PORT || 3000);

        const httpsOptions = {
            key: fs.readFileSync("../certs/localhost-key.pem"),
            cert: fs.readFileSync("../certs/localhost.pem"),
        };

        // Redirect plain HTTP → HTTPS locally (skip /health)
        app.use((req, res, next) => {
            if (req.secure || req.path === "/health") return next();
            const host = (req.headers.host || "").replace(/:\d+$/, "");
            return res.redirect(308, `https://${host}:${DEV_HTTPS_PORT}${req.url}`);
        });

        https.createServer(httpsOptions, app).listen(DEV_HTTPS_PORT, "0.0.0.0", () => {
            console.log(`🔒 HTTPS dev server: https://localhost:${DEV_HTTPS_PORT}`);
        });

        http.createServer((req: any, res: any) => {
            const host = (req.headers.host || "").replace(/:\d+$/, "");
            res.writeHead(308, { Location: `https://${host}:${DEV_HTTPS_PORT}${req.url}` });
            res.end();
        }).listen(DEV_HTTP_PORT, "0.0.0.0", () => {
            console.log(`↪ HTTP redirector:  http://localhost:${DEV_HTTP_PORT} → HTTPS`);
        });
    } catch {
        const PORT = Number(process.env.PORT || config.PORT || 3000);
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🟢 Dev server (HTTP) listening on http://localhost:${PORT}`);
            console.log("Tip: add ../certs/localhost.pem & localhost-key.pem for local HTTPS.");
        });
    }
}
