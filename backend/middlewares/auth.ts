// middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    try {
        const decoded = verifyToken(token) as { user_id: number; email: string };
        req.user = { user_id: decoded.user_id, user_email: decoded.email }; // now typed
        next();
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
};
