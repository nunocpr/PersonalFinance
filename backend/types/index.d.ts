// types/express/index.d.ts
import "express-serve-static-core";

// Augment the Request type that Express re-exports.
declare module "express-serve-static-core" {
    interface Request {
        user?: {
            user_id: number;           // internal DB id (server-only)
            user_public_id: string;    // public UUID (from JWT)
            user_email: string;
        };
    }
}
