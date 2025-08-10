import * as authRepository from "../repositories/auth.repository";
import { hashPassword, comparePassword } from "../utils/password";
import { generateResetToken } from "../utils/passwordReset";
import { generateEmailToken } from "../utils/emailVerification";
import { sha256 } from "../utils/tokens";
import { generateToken } from "../utils/jwt";
import { RegisterDto, LoginDto, AuthResponse } from "../types/auth";
import { sendEmail } from "../utils/email";
import config from "../config/config";

export const register = async (data: RegisterDto): Promise<{ message: string }> => {
    const existing = await authRepository.findUserByEmail(data.email);
    if (existing) throw new Error("Email already registered");

    const hashedPwd = await hashPassword(data.password);
    const user = await authRepository.createUser(data.email, hashedPwd, data.name);

    const { token, tokenHash, expiresAt } = generateEmailToken();
    await authRepository.setEmailVerification(user.user_id, tokenHash, expiresAt);

    const verifyUrl = `${config.FRONTEND_URL}/verify-email?uid=${encodeURIComponent(user.user_public_id)}&token=${encodeURIComponent(token)}`;

    await sendEmail(
        user.user_email,
        "Verify your email",
        `<p>Hi ${user.user_name},</p>
     <p>Please verify your email by clicking the link below (expires in ${config.EMAIL.VERIFY_TTL_HOURS} hours):</p>
     <p><a href="${verifyUrl}">Verify Email</a></p>`
    );

    return { message: "Registration successful. Check your email to verify your account." };
};

export const login = async (data: LoginDto): Promise<AuthResponse> => {
    const user = await authRepository.findUserByEmail(data.email);
    if (!user) throw new Error("Invalid credentials");

    const valid = await comparePassword(data.password, user.user_password_hash);
    if (!valid) throw new Error("Invalid credentials");

    if (!user.user_email_verified) {
        const err = new Error("EMAIL_NOT_VERIFIED");
        (err as any).code = "EMAIL_NOT_VERIFIED";
        throw err;
    }

    const token = generateToken({ user_id: user.user_id, email: user.user_email });
    const { user_password_hash, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword as any };
};

export const verifyEmail = async (uid: string, token: string): Promise<{ message: string }> => {
    if (!uid || !token) throw new Error("Invalid verification link");
    const tokenHash = sha256(token.trim());
    const verifiedUser = await authRepository.verifyEmailWithToken(uid, tokenHash);
    if (!verifiedUser) throw new Error("Invalid or expired verification link");
    return { message: "Email verified successfully. You can now log in." };
};

export const resendVerification = async (email: string): Promise<{ message: string }> => {
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
        `<p>Hi ${user.user_name},</p>
     <p>Click to verify your email:</p>
     <p><a href="${verifyUrl}">Verify Email</a></p>`
    );

    return { message: "Verification email resent." };
};

export const requestPasswordReset = async (email: string): Promise<{ message: string }> => {
    const user = await authRepository.findUserByEmail(email);
    // Always return a generic message (don’t leak if email exists)
    const generic = { message: "If that email exists, a reset link was sent." };
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
     <p>Click the link below to reset your password (expires in ${config.PASSWORD_RESET_TTL_MINUTES} minutes):</p>
     <p><a href="${url}">Reset Password</a></p>
     <p>If you didn't request this, you can ignore this email.</p>`
    );
    return generic;
};

export const resetPassword = async (
    uid: string,
    token: string,
    newPassword: string
): Promise<{ message: string }> => {
    if (!uid || !token || !newPassword) throw new Error("Invalid request");
    const tokenHash = sha256(token.trim());
    const newHash = await hashPassword(newPassword);
    const updated = await authRepository.resetPasswordUsingToken(uid, tokenHash, newHash);
    if (!updated) throw new Error("Invalid or expired reset link");
    return { message: "Password reset successful. You can now log in." };
};
