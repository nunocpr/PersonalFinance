// types/express/index.d.ts
import "express-serve-static-core";

// Augment the Request type that Express re-exports.
declare module "express-serve-static-core" {
    interface Request {
        user?: {
            id: number;           // internal DB id (server-only)
            publicId: string;    // public UUID (from JWT)
            email: string;
        };
    }
}
