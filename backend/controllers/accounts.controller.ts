// backend/controllers/accounts.controller.ts
import type { RequestHandler } from "express";
import * as service from "../services/accounts.service";

export const listAccounts: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const items = await service.getAllAccounts(req.user.publicId);
        return res.json({ items });
    } catch (e: any) {
        console.error("[accounts] list error:", e);
        return res.status(500).json({ message: e?.message ?? "Server error" });
    }
};

export const getAccount: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid account id" });
        const account = await service.getAccountById(req.user.publicId, id);
        return res.json({ account });
    } catch (e: any) {
        const status = /not found/i.test(String(e?.message)) ? 404 : 500;
        console.error("[accounts] get error:", e);
        return res.status(status).json({ message: e?.message ?? "Server error" });
    }
};

export const createAccount: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const { name, type, balance, description } = req.body || {};
        const account = await service.createNewAccount(req.user.publicId, { name, type, balance, description });
        return res.status(201).json({ account });
    } catch (e: any) {
        const status = /invalid/i.test(String(e?.message)) ? 400 : 500;
        console.error("[accounts] create error:", e);
        return res.status(status).json({ message: e?.message ?? "Server error" });
    }
};

export const updateAccount: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid account id" });
        const { name, type, balance, description } = req.body || {};
        const account = await service.updateExistingAccount(req.user.publicId, { id, name, type, balance, description });
        return res.json({ account });
    } catch (e: any) {
        const status = /not found/i.test(String(e?.message)) ? 404 : /invalid/i.test(String(e?.message)) ? 400 : 500;
        console.error("[accounts] update error:", e);
        return res.status(status).json({ message: e?.message ?? "Server error" });
    }
};

export const removeAccount: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid account id" });
        await service.deleteAccount(req.user.publicId, id);
        return res.status(204).send();
    } catch (e: any) {
        const status = /not found/i.test(String(e?.message)) ? 404 : 500;
        console.error("[accounts] delete error:", e);
        return res.status(status).json({ message: e?.message ?? "Server error" });
    }
};

export const getBalance: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid account id" });
        const balance = await service.getAccountBalance(req.user.publicId, id);
        return res.json({ balance });
    } catch (e: any) {
        const status = /not found/i.test(String(e?.message)) ? 404 : 500;
        console.error("[accounts] balance error:", e);
        return res.status(status).json({ message: e?.message ?? "Server error" });
    }
};
