import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import * as authRepo from "../repositories/auth.repository";

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });

    const token = auth.slice(7);
    try {
        const decoded = verifyToken(token) as { user_id: number; email: string };
        const dbUser = await authRepo.findUserById(decoded.user_id);
        if (!dbUser) return res.status(401).json({ message: "Session invalid" });
        if (!dbUser.user_is_active) return res.status(403).json({ message: "Account disabled" });
        if (!dbUser.user_email_verified) return res.status(403).json({ message: "Please verify your email first." });

        req.user = { user_id: dbUser.user_id, user_email: dbUser.user_email };
        next();
    } catch {
        return res.status(401).json({ message: "Unauthorized" });
    }
};