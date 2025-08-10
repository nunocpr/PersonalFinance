import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import * as authRepo from "../repositories/auth.repository";
import config from "../config/config";
import { signAccess, verifyRefresh } from "../utils/jwt";
import { UserDto } from "../types/auth";

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

const atCookie = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 15 * 60 * 1000, // 15m
};
const rtCookie = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
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
        const { access, refresh, user } = await authService.login(req.body);
        res.cookie("pf_at", access, atCookie);
        res.cookie("pf_rt", refresh, rtCookie);
        res.json({ user: user as UserDto });
    } catch (err: any) {
        console.error("[auth] loginUser failed:", err);
        if (err?.code === "EMAIL_NOT_VERIFIED" || err?.message === "EMAIL_NOT_VERIFIED") {
            return res.status(403).json({ message: MSG.LOGIN_VERIFY_FIRST, needsVerification: true });
        }
        res.status(400).json({ message: MSG.LOGIN_INVALID });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const rt = (req as any).cookies?.pf_rt as string | undefined;
        if (!rt) return res.status(401).json({ message: "Unauthorized" });

        // (optional) CSRF hardening in dev: check Origin/Referer
        const origin = req.get("origin") || req.get("referer") || "";
        if (!origin.startsWith(config.FRONTEND_URL)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const payload = verifyRefresh(rt); // { user_public_id, v }
        const user = await authRepo.findUserByPublicId(payload.user_public_id);
        if (!user || user.user_token_version !== payload.v) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const access = signAccess({ user_public_id: user.user_public_id, v: user.user_token_version });
        res.cookie("pf_at", access, atCookie);
        res.json({ ok: true });
    } catch (e) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};

export const logout = async (req: Request, res: Response) => {
    await authRepo.bumpTokenVersion(req.user!.user_public_id!);
    res.clearCookie("pf_at", { ...atCookie, maxAge: undefined });
    res.clearCookie("pf_rt", { ...rtCookie, maxAge: undefined });
    res.json({ message: "Logged out" });
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

export const me = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const user = await authRepo.findUserByPublicId(req.user.user_public_id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    res.json({ user: authService.toUserDto(user) });
};