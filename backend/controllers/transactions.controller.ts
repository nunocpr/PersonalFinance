// controllers/transactions.controller.ts
import type { RequestHandler } from "express";
import * as svc from "../services/transactions.service";
import { parseListFilters } from "../utils/parseListFilters";

export const list: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        const filters = parseListFilters(req.query);
        const data = await svc.list(req.user.publicId, filters);
        res.json(data);
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Falha ao carregar transações." });
    }
};

export const groupByCategory: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        const filters = parseListFilters(req.query);
        const data = await svc.groupByCategory(req.user.publicId, filters);
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

export const getBalance: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const accountId = Number(req.params.accountId);
    if (!Number.isFinite(accountId)) return res.status(400).json({ message: "Conta inválida." });
    try {
        const currentBalance = await svc.getCurrentBalance(req.user.publicId, accountId);
        res.json({ accountId, currentBalance });
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Falha ao obter saldo." });
    }
};

export const createTransfer: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try { res.status(201).json(await svc.createTransfer(req.user.publicId, req.body)); }
    catch (e: any) { res.status(400).json({ message: e?.message ?? "Falha ao criar transferência." }); }
};

export const removeTransfer: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try { await svc.removeTransfer(req.user.publicId, req.params.transferId); res.status(204).send(); }
    catch (e: any) {
        const code = /não encontrada/i.test(String(e?.message)) ? 404 : 400;
        res.status(code).json({ message: e?.message ?? "Falha ao remover transferência." });
    }
};

export const listTransfers: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const accountId = req.query.accountId ? Number(req.query.accountId) : undefined;
    try { res.json({ items: await svc.listTransfers(req.user.publicId, accountId) }); }
    catch (e: any) { res.status(400).json({ message: e?.message ?? "Falha ao listar transferências." }); }
};

export const convertToTransfer: RequestHandler = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        const data = await svc.convertToTransfer(req.user.publicId, req.body);
        res.json(data);
    } catch (e: any) {
        res.status(400).json({ message: e?.message ?? "Falha ao converter para transferência." });
    }
};