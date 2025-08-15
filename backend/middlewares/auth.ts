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
        const payload = verifyAccess(token); // { userPublicId, v }
        const user = await authRepo.findUserByPublicId(payload.userPublicId);
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        if (user.tokenVersion !== payload.v) return res.status(401).json({ message: "Unauthorized" });
        if (!user.isActive) return res.status(403).json({ message: "Account disabled" });
        if (!user.emailVerified) return res.status(403).json({ message: "Please verify your email first." });

        // Attach BOTH ids for server-side use only
        req.user = {
            id: user.id,                     // internal int
            publicId: user.publicId,       // public uuid
            email: user.email,
        };

        next();
    } catch {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
