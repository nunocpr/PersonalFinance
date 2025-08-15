// src/types/auth.ts
/** What we send to the frontend */
export interface UserDto {
    publicId: string;
    email: string;
    name: string;
}

/** Auth payloads */
export interface RegisterDto { email: string; password: string; name: string; }
export interface LoginDto { email: string; password: string; }

/** Login response (tokens are set in cookies, not returned in body) */
export interface AuthResponse {
    user: UserDto;
}

/** JWT payload (camelCase) */
export interface JwtPayload {
    userPublicId: string; // from JWT
    v: number;            // tokenVersion
}
