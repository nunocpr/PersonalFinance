// src/controllers/transactionRules.controller.ts
import type { RequestHandler } from "express";
import * as svc from "../services/transactionRules.service";

export const list: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const data = await svc.list(req.user.publicId);
    res.json(data);
};

export const create: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        const rule = await svc.create(req.user.publicId, req.body);
        res.status(201).json(rule);
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Falha ao criar regra." });
    }
};

export const update: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        const id = Number(req.params.id);
        const rule = await svc.update(req.user.publicId, id, req.body);
        res.json(rule);
    } catch (e: any) {
        const code = /não encontrada/i.test(String(e?.message)) ? 404 : 400;
        res.status(code).json({ message: e?.message ?? "Falha ao atualizar regra." });
    }
};

export const remove: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        const id = Number(req.params.id);
        await svc.remove(req.user.publicId, id);
        res.status(204).send();
    } catch (e: any) {
        const code = /não encontrada/i.test(String(e?.message)) ? 404 : 400;
        res.status(code).json({ message: e?.message ?? "Falha ao remover regra." });
    }
};

export const reorder: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((n: any) => Number(n)).filter(Number.isFinite) : [];
        await svc.reorder(req.user.publicId, ids);
        res.json({ ok: true });
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Falha ao reordenar regras." });
    }
};
