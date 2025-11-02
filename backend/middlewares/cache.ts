// middlewares/cache.ts
import { Request, Response, NextFunction } from "express";

export const noStorePrivate = (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Authorization, Cookie");
    next();
};

export const noStore = (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");
    next();
};
