// src/controllers/category.controller.ts
import { Request, Response } from "express";
import * as service from "../services/category.service";

export const listTree = async (req: Request, res: Response) => {
    const uid = req.user!.publicId;
    const data = await service.listTree(uid);
    res.json({ categories: data });
};

export const create = async (req: Request, res: Response) => {
    const uid = req.user!.publicId;
    try {
        const c = await service.create(uid, req.body);
        res.status(201).json(c);
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Failed to create category" });
    }
};

export const patch = async (req: Request, res: Response) => {
    const uid = req.user!.publicId;
    const id = Number(req.params.id);
    try {
        const c = await service.patch(uid, id, req.body);
        res.json(c);
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Failed to update" });
    }
};

export const move = async (req: Request, res: Response) => {
    const uid = req.user!.publicId;
    const id = Number(req.params.id);
    const { parentId } = req.body as { parentId: number | null };
    try {
        const c = await service.move(uid, id, parentId ?? null);
        res.json(c);
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Failed to move" });
    }
};

export const reorder = async (req: Request, res: Response) => {
    const uid = req.user!.publicId;
    try {
        await service.reorder(uid, req.body);
        res.json({ ok: true });
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Failed to reorder" });
    }
};

export const archive = async (req: Request, res: Response) => {
    const uid = req.user!.publicId;
    const id = Number(req.params.id);
    try {
        const c = await service.archive(uid, id);
        res.json(c);
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Failed to archive" });
    }
};

export const destroy = async (req: Request, res: Response) => {
    const uid = req.user!.publicId;
    const id = Number(req.params.id);
    try {
        await service.hardDelete(uid, id);
        res.status(204).send();
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Failed to delete" });
    }
};
