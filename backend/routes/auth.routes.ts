import { Router } from "express";
import {
    registerUser,
    loginUser,
    verifyEmail,
    verifyEmailPost,
    resendVerification,
    forgotPassword,
    resetPassword
} from "../controllers/auth.controller";

const router = Router();

// AUTH ROUTES
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email", verifyEmail); // from email links
router.post("/verify-email", verifyEmailPost); // from frontend POST
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
