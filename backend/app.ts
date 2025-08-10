// app.ts
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import config from "./config/config";

// routes
import authRoutes from "./routes/auth.routes";
import accountRoutes from "./routes/accounts.routes";
import transactionsRouter from "./routes/transactions.routes";
import errorHandler from "./middlewares/errorHandler";

const app = express();

// Parse body early
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging (before other middlewares is fine)
app.use(morgan("dev"));

// Security headers
app.use(
    helmet({
        // In dev, avoid sticky HSTS on localhost. Turn it on in prod.
        hsts: process.env.NODE_ENV === "production" ? { maxAge: 15552000 } : false,
        // Optional: relax CSP during dev; enable a real CSP later.
        contentSecurityPolicy: false,
    })
);

// CORS — point to your HTTPS frontend
app.use(
    cors({
        origin: config.FRONTEND_URL, // e.g. https://localhost:5173
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionsRouter);

// Error handling last
app.use(errorHandler);

export default app;
