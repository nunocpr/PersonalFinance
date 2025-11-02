import { Router } from "express";
import {
    registerUser, loginUser, verifyEmail,
    resendVerification, forgotPassword, resetPassword, me, logout, refresh
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";
import { noStore } from "../middlewares/cache";

export const protectedAuth = Router();

export const publicAuth = Router();

protectedAuth.post("/logout", authenticate, noStore, logout);
protectedAuth.post("/refresh", noStore, refresh);
protectedAuth.get("/me", authenticate, noStore, me);

publicAuth.post("/register", registerUser);
publicAuth.post("/login", noStore, loginUser);
publicAuth.post("/verify-email", verifyEmail);
publicAuth.post("/resend-verification", resendVerification);
publicAuth.post("/forgot-password", forgotPassword);
publicAuth.post("/reset-password", resetPassword);

export default { protectedAuth, publicAuth };
