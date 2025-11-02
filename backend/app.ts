// app.ts
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import config from "./config/config";
import cookieParser from "cookie-parser";
import { Router } from "express";


// routes
import categoryRoutes from "./routes/category.routes";
import userRoutes from "./routes/user.routes";
import { publicAuth, protectedAuth } from "./routes/auth.routes";
import accountRoutes from "./routes/accounts.routes";
import rulesRoutes from "./routes/transactionRules.routes";
import transactionsRouter from "./routes/transactions.routes";
import errorHandler from "./middlewares/errorHandler";
import { noStore, noStorePrivate } from "./middlewares/cache";
import { authenticate } from "./middlewares/auth";


const app = express();

// Parse body early
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging (before other middlewares is fine)
if (process.env.NODE_ENV !== "production")
    app.use(morgan("dev"));

const allowedOrigins = [
    config.FRONTEND_ORIGIN,               // e.g. "https://nunocpr.github.io"
    ...(process.env.NODE_ENV !== "production" ? ["https://localhost:5173"] : []),
];

// Always add CORS headers
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Vary", "Origin");
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    }
    // Handle preflight here so it never falls through to a 404/redirect
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});


// Security headers
app.use(
    helmet({
        // In dev, avoid sticky HSTS on localhost. Turn it on in prod.
        hsts: process.env.NODE_ENV === "production" ? { maxAge: 15552000 } : false,
        // Optional: relax CSP during dev; enable a real CSP later.
        contentSecurityPolicy: false,
    })
);

// ---------- Public routes (no auth) ----------
app.use("/api/auth", noStore, publicAuth); // login/logout/refresh/me lives here; `me` will be protected inside

const protectedApi = Router();

protectedApi.use(authenticate, noStorePrivate);


// --- Routes ---
protectedApi.use("/auth", protectedAuth);
protectedApi.use("/accounts", accountRoutes);
protectedApi.use("/transactions", transactionsRouter);
protectedApi.use("/users", userRoutes);
protectedApi.use("/categories", noStore, categoryRoutes);
protectedApi.use("/transaction-rules", rulesRoutes);

app.use("/api", protectedApi);

// Error handling last
app.use(errorHandler);

export default app;
