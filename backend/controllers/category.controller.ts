import { RequestHandler } from "express";
import * as repo from "../repositories/category.repository";

// GET /api/categories/tree
export const list: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const items = await repo.listTree(req.user.publicId);
    return res.json(items); // <= return the array, not { items }
};


// POST /api/categories
export const create: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const payload = {
        name: String(req.body?.name || "").trim(),
        description: req.body?.description ?? null,
        parentId: req.body?.parentId ?? null,
        sortOrder: req.body?.sortOrder ?? undefined,
        icon: req.body?.icon ?? null,
        color: req.body?.color ?? null,
        type: req.body?.type ?? "expense",
    };

    if (!payload.name) return res.status(400).json({ message: "Nome obrigatório" });

    const created = await repo.create(req.user.publicId, payload);
    res.status(201).json(created);
};

// PATCH /api/categories/:id
export const update: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID inválido" });

    const patch = {
        name: req.body?.name,
        description: req.body?.description,
        icon: req.body?.icon,
        color: req.body?.color,
        type: req.body?.type,
        archived: req.body?.archived,
    };

    const updated = await repo.update(req.user.publicId, id, patch as any);
    res.json(updated);
};

// PATCH /api/categories/:id/move
export const move: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const id = Number(req.params.id);
    const parentId = req.body?.parentId ?? null;

    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID inválido" });
    if (parentId !== null && !Number.isInteger(parentId)) {
        return res.status(400).json({ message: "parentId inválido" });
    }

    const moved = await repo.move(req.user.publicId, id, parentId);
    res.json(moved);
};

// PATCH /api/categories/reorder
export const reorderSiblings: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const parentId = req.body?.parentId ?? null;
    const orderedIds: number[] = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];

    if (parentId !== null && !Number.isInteger(parentId)) {
        return res.status(400).json({ message: "parentId inválido" });
    }
    if (!orderedIds.every((x) => Number.isInteger(x))) {
        return res.status(400).json({ message: "orderedIds inválidos" });
    }

    await repo.reorderSiblings(req.user.publicId, parentId, orderedIds);
    res.json({ ok: true });
};

// DELETE /api/categories/:id (arquivar)
export const archive: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID inválido" });

    const updated = await repo.archive(req.user.publicId, id);
    res.json(updated);
};

// DELETE /api/categories/:id/hard (apagar definitivo)
export const hardDelete: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID inválido" });

    await repo.hardDelete(req.user.publicId, id);
    res.status(204).send();
};
