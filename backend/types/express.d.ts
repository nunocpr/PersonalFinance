// express.d.ts
export interface User {
    user_id: number;
    user_public_id: string;
    user_email: string;
    user_name: string;
    user_is_active: boolean;
    user_email_verified: boolean;
    user_created_at: string;
    user_updated_at: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: Pick<User, "user_id" | "user_email">;
        }
    }
}
