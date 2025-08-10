import { Request, Response } from "express";
import * as userService from "../services/user.service";

export const updateMe = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const { user_name } = req.body as { user_name?: string };
        const result = await userService.changeDisplayName(req.user.user_id, user_name || "");
        res.json(result); // { user }
    } catch (err) {
        console.error("[user] updateMe failed:", err);
        const msg = err instanceof Error && err.message === "Invalid name" ? err.message : "Update failed";
        res.status(400).json({ message: msg });
    }
};

export const changeMyPassword = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const { current_password, new_password } = req.body as { current_password?: string; new_password?: string };
        const result = await userService.changePassword(req.user.user_id, current_password || "", new_password || "");
        res.json(result); // { message }
    } catch (err: any) {
        console.error("[user] changeMyPassword failed:", err);
        if (err?.code === "INVALID_CURRENT_PASSWORD" || err?.message === "INVALID_CURRENT_PASSWORD") {
            return res.status(400).json({ message: "Current password is incorrect" });
        }
        const msg = err instanceof Error && err.message === "Password too short" ? err.message : "Update failed";
        res.status(400).json({ message: msg });
    }
};
