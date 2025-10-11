// server.ts
import app from "./app";
import config from "./config/config";

const IS_PROD = process.env.NODE_ENV === "production";

// Trust the platform proxy so req.secure works (X-Forwarded-Proto)
app.set("trust proxy", 1);

// In production: no local certs. TLS terminates at the platform edge.
// Optionally enforce HTTPS using the forwarded proto header.
if (IS_PROD) {
    app.use((req, res, next) => {
        const proto = (req.headers["x-forwarded-proto"] as string) || (req.secure ? "https" : "http");
        if (proto !== "https") {
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
    });

    const PORT = Number(process.env.PORT || config.PORT || 3000);
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server listening on port ${PORT} (production)`);
    });
} else {
    // Development: try to start HTTPS with local certs.
    // If certs are missing, fall back to plain HTTP.
    const DEV_HTTPS_PORT = Number(process.env.DEV_HTTPS_PORT || config.PORT || 3443);
    const DEV_HTTP_PORT = Number(process.env.DEV_HTTP_PORT || 3000);

    try {
        // Lazy-require only in dev so prod bundle doesn’t need these modules/files
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require("fs");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const http = require("http");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const https = require("https");

        const httpsOptions = {
            key: fs.readFileSync("../certs/localhost-key.pem"),
            cert: fs.readFileSync("../certs/localhost.pem"),
        };

        // Redirect HTTP -> HTTPS locally
        app.use((req, res, next) => {
            if (req.secure) return next();
            const host = (req.headers.host || "").replace(/:\d+$/, "");
            return res.redirect(301, `https://${host}:${DEV_HTTPS_PORT}${req.url}`);
        });

        https.createServer(httpsOptions, app).listen(DEV_HTTPS_PORT, "0.0.0.0", () => {
            console.log(`🔒 HTTPS dev server: https://localhost:${DEV_HTTPS_PORT}`);
            console.log(`🌱 NODE_ENV: ${process.env.NODE_ENV || "development"}`);
        });

        http.createServer((req: any, res: any) => {
            const host = (req.headers.host || "").replace(/:\d+$/, "");
            res.statusCode = 301;
            res.setHeader("Location", `https://${host}:${DEV_HTTPS_PORT}${req.url}`);
            res.end();
        }).listen(DEV_HTTP_PORT, "0.0.0.0", () => {
            console.log(`↪ HTTP redirector:  http://localhost:${DEV_HTTP_PORT} → HTTPS`);
        });
    } catch (err) {
        // Fallback: no certs available -> just run HTTP in dev
        const PORT = Number(process.env.PORT || config.PORT || 3000);
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🟢 Dev server (HTTP) listening on http://localhost:${PORT}`);
            console.log("Tip: add ../certs/localhost.pem & localhost-key.pem for local HTTPS.");
        });
    }
}
