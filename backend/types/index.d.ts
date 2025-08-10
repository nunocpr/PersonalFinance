// types/express/index.d.ts
import "express-serve-static-core";

// Augment the *real* Request type that Express re-exports.
declare module "express-serve-static-core" {
    interface Request {
        user?: {
            user_id: number;
            user_email: string;
        };
    }
}
