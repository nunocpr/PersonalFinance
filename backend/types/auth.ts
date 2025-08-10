export interface User {
    user_id: number;
    user_public_id: string;
    user_email: string;
    user_password_hash: string;
    user_name: string;
    user_is_active: boolean;
    user_email_verified: boolean;
    user_created_at: Date;
    user_updated_at: Date;
}

export interface RegisterDto {
    email: string;
    password: string;
    name: string;
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: Omit<User, 'user_password_hash'>;
}
