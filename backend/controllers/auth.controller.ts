import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export const registerUser = async (req: Request, res: Response) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ message: err instanceof Error ? err.message : "Registration failed" });
    }
};

export const loginUser = async (req: Request, res: Response) => {
    try {
        const result = await authService.login(req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err instanceof Error ? err.message : "Login failed" });
    }
};
