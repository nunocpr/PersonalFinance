import * as authRepository from "../repositories/auth.repository";
import { hashPassword, comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { RegisterDto, LoginDto, AuthResponse } from "../types/auth";

export const register = async (data: RegisterDto): Promise<AuthResponse> => {
    const existing = await authRepository.findUserByEmail(data.email);
    if (existing) throw new Error("Email already registered");

    const hashed = await hashPassword(data.password);
    const user = await authRepository.createUser(data.email, hashed, data.name);

    const token = generateToken({ user_id: user.user_id, email: user.user_email });

    const { user_password_hash, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
};

export const login = async (data: LoginDto): Promise<AuthResponse> => {
    const user = await authRepository.findUserByEmail(data.email);
    if (!user) throw new Error("Invalid credentials");

    const valid = await comparePassword(data.password, user.user_password_hash);
    if (!valid) throw new Error("Invalid credentials");

    const token = generateToken({ user_id: user.user_id, email: user.user_email });

    const { user_password_hash, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
};
