// server.ts
import fs from "fs";
import http from "http";
import https from "https";
import app from "./app";
import config from "./config/config";

const HTTPS_PORT = Number(config.PORT || 3443);
const HTTP_PORT = 3000;

const httpsOptions = {
    key: fs.readFileSync("../certs/localhost-key.pem"),
    cert: fs.readFileSync("../certs/localhost.pem"),
};

// trust proxy (useful later behind reverse proxies)
app.set("trust proxy", 1);

// Enforce HTTPS at app level (defense in depth)
app.use((req, res, next) => {
    if (req.secure) return next();
    const host = (req.headers.host || "").replace(/:\d+$/, "");
    return res.redirect(301, `https://${host}:${HTTPS_PORT}${req.url}`);
});

https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
    console.log(`🔒 HTTPS server running at https://localhost:${HTTPS_PORT}`);
    console.log(`Env: ${process.env.NODE_ENV || "development"}`);
});

// Lightweight HTTP → HTTPS redirect server
http.createServer((req, res) => {
    const host = (req.headers.host || "").replace(/:\d+$/, "");
    res.statusCode = 301;
    res.setHeader("Location", `https://${host}:${HTTPS_PORT}${req.url}`);
    res.end();
}).listen(HTTP_PORT, () => {
    console.log(`↪ HTTP redirector on https://localhost:${HTTP_PORT} → HTTPS`);
});
