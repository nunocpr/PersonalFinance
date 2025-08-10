// middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccess } from "../utils/jwt";
import * as authRepo from "../repositories/auth.repository";

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const cookieToken = (req as any).cookies?.pf_at as string | undefined;
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const token = cookieToken ?? bearer;

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const payload = verifyAccess(token); // { user_public_id, v }
        const user = await authRepo.findUserByPublicId(payload.user_public_id);
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        if (user.user_token_version !== payload.v) return res.status(401).json({ message: "Unauthorized" });
        if (!user.user_is_active) return res.status(403).json({ message: "Account disabled" });
        if (!user.user_email_verified) return res.status(403).json({ message: "Please verify your email first." });

        // Attach BOTH ids for server-side use only
        req.user = {
            user_id: user.user_id,                     // internal int
            user_public_id: user.user_public_id,       // public uuid
            user_email: user.user_email,
        };

        next();
    } catch {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
