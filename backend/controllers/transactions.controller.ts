// controllers/transactions.controller.ts
import type { RequestHandler } from "express";
import * as svc from "../services/transactions.service";

export const list: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        const data = await svc.list(req.user.publicId, req.query as any);
        res.json(data);
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Falha ao carregar transações." });
    }
};

export const groupByCategory: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        const data = await svc.groupByCategory(req.user.publicId, req.query as any);
        res.json(data);
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Falha ao carregar transações." });
    }
};

export const create: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        const t = await svc.create(req.user.publicId, req.body);
        res.status(201).json(t);
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Falha ao criar transação." });
    }
};

export const update: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        const t = await svc.update(req.user.publicId, req.params.id, req.body);
        res.json(t);
    } catch (e: any) {
        const code = /não encontrada/i.test(String(e?.message)) ? 404 : 400;
        res.status(code).json({ message: e?.message ?? "Falha ao atualizar transação." });
    }
};

export const remove: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        await svc.remove(req.user.publicId, req.params.id);
        res.status(204).send();
    } catch (e: any) {
        const code = /não encontrada/i.test(String(e?.message)) ? 404 : 400;
        res.status(code).json({ message: e?.message ?? "Falha ao remover transação." });
    }
};
