import { Router } from "express";
import {
    registerUser,
    loginUser,
    verifyEmail,
    verifyEmailPost,
    resendVerification,
    forgotPassword,
    resetPassword,
    me
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();

// AUTH ROUTES
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email", verifyEmail); // from email links
router.post("/verify-email", verifyEmailPost); // from frontend POST
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authenticate, me);

export default router;
