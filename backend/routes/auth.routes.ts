import { Router } from "express";
import {
    registerUser, loginUser, verifyEmail, verifyEmailPost,
    resendVerification, forgotPassword, resetPassword, me, logout, refresh
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logout);
router.post("/refresh", refresh);

router.get("/verify-email", verifyEmail);
router.post("/verify-email", verifyEmailPost);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/me", authenticate, me);

export default router;
