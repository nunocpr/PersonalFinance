// src/services/auth/auth.service.ts
import client from "@/services/api/client";
import type { AuthResponse, LoginDto, RegisterDto } from "@/types/auth";

const TOKEN_KEY = "pf_token";
const USER_KEY = "pf_user";

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }
export function getUser() { const raw = localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) : null; }
export function setUser(u: unknown) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
export function clearUser() { localStorage.removeItem(USER_KEY); }

export async function login(payload: LoginDto): Promise<AuthResponse> {
    const res = await client.post<AuthResponse>("/auth/login", payload);
    setToken(res.data.token); setUser(res.data.user);
    return res.data;
}

export async function register(payload: RegisterDto): Promise<{ message: string }> {
    const res = await client.post<{ message: string }>("/auth/register", payload);
    return res.data;
}

export async function resendVerification(email: string): Promise<{ message: string }> {
    const res = await client.post<{ message: string }>("/auth/resend-verification", { email });
    return res.data;
}

export async function verifyEmail(uid: string, token: string): Promise<{ message: string }> {
    const res = await client.get<{ message: string }>("/auth/verify-email", { params: { uid, token } });
    return res.data;
}

export function logout() { clearToken(); clearUser(); }
export function isAuthed() { return !!getToken(); }

export async function forgotPassword(email: string): Promise<{ message: string }> {
    const res = await client.post<{ message: string }>("/auth/forgot-password", { email });
    return res.data;
}

export async function resetPassword(payload: { uid: string; token: string; password: string }): Promise<{ message: string }> {
    const res = await client.post<{ message: string }>("/auth/reset-password", payload);
    return res.data;
}
