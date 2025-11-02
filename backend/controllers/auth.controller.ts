import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import * as authRepo from "../repositories/auth.repository";
import config from "../config/config";
import { signAccess, verifyRefresh } from "../utils/jwt";

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
    sameSite: "none" as const,
    path: "/",
    maxAge: 15 * 60 * 1000, // 15m
};
const rtCookie = {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
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
        res.json({ user });
    } catch (err: any) {
        if (err?.code === "EMAIL_NOT_VERIFIED" || err?.message === "EMAIL_NOT_VERIFIED") {
            return res.status(403).json({ message: "Please verify your email first.", needsVerification: true });
        }
        res.status(400).json({ message: "Invalid email or password" });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const rt = (req as any).cookies?.pf_rt as string | undefined;
        if (!rt) return res.status(401).json({ message: "Unauthorized" });

        const origin = req.get("origin") || req.get("referer") || "";
        if (!origin.startsWith(config.FRONTEND_ORIGIN)) return res.status(403).json({ message: "Forbidden" });

        const payload = verifyRefresh(rt); // { userPublicId, v }
        const user = await authRepo.findUserByPublicId(payload.userPublicId);
        if (!user || user.tokenVersion !== payload.v) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const access = signAccess({ userPublicId: user.publicId, v: user.tokenVersion });
        res.cookie("pf_at", access, atCookie);
        res.json({ ok: true });
    } catch {
        return res.status(401).json({ message: "Unauthorized" });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        console.log("[auth] logout requested for user:", req.user?.publicId);
        await authService.bumpTokenVersionByPublicId(req.user?.publicId);
    } catch (e) {
        console.error("[auth] logout bump failed:", e);
    } finally {
        console.error("[auth] clearing cookies on logout");

        // clear regardless of bump result
        res.clearCookie("pf_at", { ...atCookie, expires: new Date(0), maxAge: 0 });
        res.clearCookie("pf_rt", { ...rtCookie, expires: new Date(0), maxAge: 0 });

        res.json({ message: "Logged out" });
    }
};

/**
 * POST /api/auth/verify-email
 * Body: { uid: string, token: string }
 * For frontend-initiated verification (keeps token out of access logs).
 */
export const verifyEmail = async (req: Request, res: Response) => {
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
    const user = await authRepo.findUserByPublicId(req.user.publicId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    res.json({ user: authService.toUserDto(user) });
};
