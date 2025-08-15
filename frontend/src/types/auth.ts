export interface LoginDto { email: string; password: string; }
export interface RegisterDto extends LoginDto { name: string; }

export interface UserDto {
    publicId: string;
    email: string;
    name: string;
}
