// src/services/auth/auth.service.ts
import client from "@/services/api/client";
import type { LoginDto, RegisterDto, UserDto } from "@/types/auth";

export async function login(payload: LoginDto) {
    const res = await client.post<{ user: UserDto }>("/auth/login", payload);
    return res.data.user;
}

export async function logout() {
    await client.post("/auth/logout");
}

export async function create(payload: RegisterDto): Promise<{ message: string }> {
    const res = await client.post<{ message: string }>("/auth/register", payload);
    return res.data;
}

export async function verifyEmail(uid: string, token: string) {
    const res = await client.post<{ message: string }>("/auth/verify-email", { uid, token });
    return res.data;
}

export async function resendVerification(email: string): Promise<{ message: string }> {
    const res = await client.post<{ message: string }>("/auth/resend-verification", { email });
    return res.data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
    const res = await client.post<{ message: string }>("/auth/forgot-password", { email });
    return res.data;
}

export async function resetPassword(payload: { uid: string; token: string; password: string }): Promise<{ message: string }> {
    const res = await client.post<{ message: string }>("/auth/reset-password", payload);
    return res.data;
}

export async function getMe(): Promise<UserDto> {
    const res = await client.get<{ user: UserDto }>("/auth/me");
    return res.data.user;
}