export interface LoginDto { email: string; password: string; }
export interface RegisterDto extends LoginDto { name: string; }

export interface UserDto {
    user_public_id: string;
    user_email: string;
    user_name: string;
}
