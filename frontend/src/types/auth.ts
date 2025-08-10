export interface User {
    user_id: number;
    user_email: string;
    user_name: string;
    user_email_verified: boolean;
}

export interface AuthResponse {
    token: string;
    user: User;
}
export interface LoginDto { email: string; password: string; }
export interface RegisterDto extends LoginDto { name: string; }
