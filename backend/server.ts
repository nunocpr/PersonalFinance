// server.ts
import app from "./app";
import config from "./config/config";

const platformPort = process.env.PORT; // Koyeb/Render/Fly set this
const isProd = process.env.NODE_ENV === "production" || !!platformPort;

// trust proxy so req.secure works behind Koyeb's proxy
app.set("trust proxy", 1);

if (isProd) {
    const PORT = Number(platformPort || config.PORT || 3000);
    // Optional HTTPS enforcement behind proxy
    app.use((req, res, next) => {
        const proto = (req.headers["x-forwarded-proto"] as string) || (req.secure ? "https" : "http");
        if (proto !== "https") return res.redirect(301, `https://${req.headers.host}${req.url}`);
        next();
    });

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server listening on port ${PORT} (prod)`);
    });
} else {
    // ---- Local dev (HTTPS if certs exist, else HTTP) ----
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

        app.use((req, res, next) => {
            if (req.secure) return next();
            const host = (req.headers.host || "").replace(/:\d+$/, "");
            return res.redirect(301, `https://${host}:${DEV_HTTPS_PORT}${req.url}`);
        });

        https.createServer(httpsOptions, app).listen(DEV_HTTPS_PORT, "0.0.0.0", () => {
            console.log(`🔒 HTTPS dev server: https://localhost:${DEV_HTTPS_PORT}`);
        });

        http.createServer((req: any, res: any) => {
            const host = (req.headers.host || "").replace(/:\d+$/, "");
            res.writeHead(301, { Location: `https://${host}:${DEV_HTTPS_PORT}${req.url}` });
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
