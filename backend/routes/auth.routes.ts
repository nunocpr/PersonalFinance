import { Router } from "express";
import {
    registerUser, loginUser, verifyEmail,
    resendVerification, forgotPassword, resetPassword, me, logout, refresh
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";
import { noStore } from "../middlewares/cache";

const router = Router();

router.post("/register", registerUser);
router.post("/login", noStore, loginUser);
router.post("/logout", authenticate, noStore, logout);
router.post("/refresh", noStore, refresh);

router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/me", authenticate, noStore, me);

export default router;
