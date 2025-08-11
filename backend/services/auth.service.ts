import * as authRepository from "../repositories/auth.repository";
import { hashPassword, comparePassword } from "../utils/password";
import { generateResetToken } from "../utils/passwordReset";
import { generateEmailToken } from "../utils/emailVerification";
import { sha256 } from "../utils/tokens";
import { signAccess, signRefresh } from "../utils/jwt";
import { RegisterDto, LoginDto, UserDto } from "../types/auth";
import { sendEmail } from "../utils/email";
import config from "../config/config";

export async function register(data: RegisterDto): Promise<{ message: string }> {
    const existing = await authRepository.findUserByEmail(data.email);
    if (existing) throw new Error("Email already registered");

    const hashedPwd = await hashPassword(data.password);
    const user = await authRepository.createUser(data.email, hashedPwd, data.name);

    const { token, tokenHash, expiresAt } = generateEmailToken();
    await authRepository.setEmailVerification(user.user_id, tokenHash, expiresAt);

    const verifyUrl =
        `${config.FRONTEND_URL}/verify-email?uid=${encodeURIComponent(user.user_public_id)}&token=${encodeURIComponent(token)}`;

    await sendEmail(
        user.user_email,
        "Verify your email",
        `<p>Hi ${user.user_name},</p>
     <p>Please verify your email by clicking the link below (expires in ${config.EMAIL.VERIFY_TTL_HOURS} hours):</p>
     <p><a href="${verifyUrl}">Verify Email</a></p>`
    );

    return { message: "Registration successful. Check your email to verify your account." };
}

export async function login(data: LoginDto): Promise<{ access: string; refresh: string; user: UserDto }> {
    const user = await authRepository.findUserByEmail(data.email);
    if (!user) throw new Error("Invalid credentials");

    const valid = await comparePassword(data.password, user.user_password_hash);
    if (!valid) throw new Error("Invalid credentials");

    if (!user.user_email_verified) {
        const err = new Error("EMAIL_NOT_VERIFIED");
        (err as any).code = "EMAIL_NOT_VERIFIED";
        throw err;
    }

    const payload = { user_public_id: user.user_public_id, v: user.user_token_version };
    const access = signAccess(payload);
    const refresh = signRefresh(payload);

    return { access, refresh, user: toUserDto(user) };
}

export async function verifyEmail(uid: string, token: string): Promise<{ message: string }> {
    if (!uid || !token) throw new Error("Invalid verification link");
    const tokenHash = sha256(token.trim());
    const ok = await authRepository.verifyEmailWithToken(uid, tokenHash);
    if (!ok) throw new Error("Invalid or expired verification link");
    return { message: "Email verified successfully. You can now log in." };
}

export async function resendVerification(email: string): Promise<{ message: string }> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error("User not found");
    if (user.user_email_verified) return { message: "Email already verified" };

    const { token, tokenHash, expiresAt } = generateEmailToken();
    await authRepository.setEmailVerification(user.user_id, tokenHash, expiresAt);

    const verifyUrl = `${config.FRONTEND_URL}/api/auth/verify-email?uid=${encodeURIComponent(
        user.user_public_id
    )}&token=${encodeURIComponent(token)}`;

    await sendEmail(
        user.user_email,
        "Verify your email (resend)",
        `<p>Hi ${user.user_name},</p><p><a href="${verifyUrl}">Verify Email</a></p>`
    );

    return { message: "Verification email resent." };
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
    const generic = { message: "If that email exists, a reset link was sent." };
    const user = await authRepository.findUserByEmail(email);
    if (!user) return generic;

    const { token, tokenHash, expiresAt } = generateResetToken();
    await authRepository.setPasswordResetToken(user.user_id, tokenHash, expiresAt);

    const url = `${config.FRONTEND_URL}/reset-password?uid=${encodeURIComponent(
        user.user_public_id
    )}&token=${encodeURIComponent(token)}`;

    await sendEmail(
        user.user_email,
        "Reset your PersonalFinance password",
        `<p>Hi ${user.user_name},</p>
     <p><a href="${url}">Reset Password</a></p>`
    );
    return generic;
}

export async function resetPassword(uid: string, token: string, newPassword: string): Promise<{ message: string }> {
    if (!uid || !token || !newPassword) throw new Error("Invalid request");
    const tokenHash = sha256(token.trim());
    const newHash = await hashPassword(newPassword);
    const updated = await authRepository.resetPasswordUsingToken(uid, tokenHash, newHash);
    if (!updated) throw new Error("Invalid or expired reset link");
    return { message: "Password reset successful. You can now log in." };
}

export async function bumpTokenVersionByPublicId(publicId?: string): Promise<void> {
    if (!publicId) return;
    await authRepository.bumpTokenVersion(publicId);
}

export function toUserDto(user: any): UserDto {
    return {
        user_public_id: user.user_public_id,
        user_email: user.user_email,
        user_name: user.user_name,
    };
}
