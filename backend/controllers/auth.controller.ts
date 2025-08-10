import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import config from "../config/config";

const MSG = {
    REGISTER_DUPLICATE: "Email already registered",
    REGISTER_FAILED: "Registration failed",
    LOGIN_INVALID: "Invalid email or password",
    LOGIN_VERIFY_FIRST: "Please verify your email first.",
    VERIFY_OK: "Email verified successfully. You can now log in.",
    VERIFY_INVALID: "Invalid verification link",
    RESEND_GENERIC: "If that email exists, a verification email has been sent.",
    FORGOT_GENERIC: "If that email exists, a reset link was sent.",
    RESET_OK: "Password reset successful. You can now log in.",
    RESET_INVALID: "Invalid or expired reset link",
};

export const registerUser = async (req: Request, res: Response) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result); // { message }
    } catch (err) {
        console.error("[auth] registerUser failed:", err);
        const safe =
            err instanceof Error && err.message === "Email already registered"
                ? MSG.REGISTER_DUPLICATE
                : MSG.REGISTER_FAILED;
        res.status(400).json({ message: safe });
    }
};

export const loginUser = async (req: Request, res: Response) => {
    try {
        const result = await authService.login(req.body); // { token, user }
        res.json(result);
    } catch (err: any) {
        console.error("[auth] loginUser failed:", err);
        if (err?.code === "EMAIL_NOT_VERIFIED" || err?.message === "EMAIL_NOT_VERIFIED") {
            return res.status(403).json({ message: MSG.LOGIN_VERIFY_FIRST, needsVerification: true });
        }
        // Do not leak details: generic invalid creds message
        res.status(400).json({ message: MSG.LOGIN_INVALID });
    }
};

/**
 * GET /api/auth/verify-email?uid=...&token=...
 * For email links. Verifies then redirects to the frontend with a status.
 * We keep the message generic in the redirect to avoid leaking internals.
 */
export const verifyEmail = async (req: Request, res: Response) => {
    const { uid, token } = req.query as { uid?: string; token?: string };
    try {
        await authService.verifyEmail(uid || "", token || "");
        const url = `${config.FRONTEND_URL}/verify-email?status=ok`;
        res.redirect(302, url);
    } catch (err) {
        console.error("[auth] verifyEmail (GET) failed:", err);
        const url = `${config.FRONTEND_URL}/verify-email?status=error&msg=${encodeURIComponent(
            MSG.VERIFY_INVALID
        )}`;
        res.redirect(302, url);
    }
};

/**
 * POST /api/auth/verify-email
 * Body: { uid: string, token: string }
 * For frontend-initiated verification (keeps token out of access logs).
 */
export const verifyEmailPost = async (req: Request, res: Response) => {
    const { uid, token } = req.body as { uid?: string; token?: string };
    try {
        await authService.verifyEmail(uid || "", token || "");
        res.json({ message: MSG.VERIFY_OK });
    } catch (err) {
        console.error("[auth] verifyEmail (POST) failed:", err);
        res.status(400).json({ message: MSG.VERIFY_INVALID });
    }
};

/**
 * POST /api/auth/resend-verification
 * Body: { email: string }
 * Always return a generic success message to avoid account enumeration.
 */
export const resendVerification = async (req: Request, res: Response) => {
    try {
        const { email } = req.body as { email: string };
        await authService.resendVerification(email);
        res.json({ message: MSG.RESEND_GENERIC });
    } catch (err) {
        console.error("[auth] resendVerification failed:", err);
        // Still return generic message
        res.json({ message: MSG.RESEND_GENERIC });
    }
};

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 * Always return a generic success message.
 */
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body as { email?: string };
        await authService.requestPasswordReset(email || "");
        res.json({ message: MSG.FORGOT_GENERIC });
    } catch (err) {
        console.error("[auth] forgotPassword failed:", err);
        res.json({ message: MSG.FORGOT_GENERIC });
    }
};

/**
 * POST /api/auth/reset-password
 * Body: { uid: string, token: string, password: string }
 */
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { uid, token, password } = req.body as {
            uid?: string;
            token?: string;
            password?: string;
        };
        const result = await authService.resetPassword(uid || "", token || "", password || "");
        res.json(result); // { message }
    } catch (err) {
        console.error("[auth] resetPassword failed:", err);
        res.status(400).json({ message: MSG.RESET_INVALID });
    }
};
