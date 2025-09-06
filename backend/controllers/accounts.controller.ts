// backend/controllers/accounts.controller.ts
import type { RequestHandler } from "express";
import * as service from "../services/accounts.service";

const isInt = (v: any) => Number.isInteger(v);

/** GET /accounts */
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

/** GET /accounts/:id */
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

/** POST /accounts
 * Body: { name, type, openingBalance?, openingDate?, description? }
 * openingBalance is integer cents; openingDate is ISO string or null
 */
export const createAccount: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const { name, type, openingBalance, openingDate, description } = req.body || {};

        if (openingBalance !== undefined && !isInt(openingBalance)) {
            return res.status(400).json({ message: "openingBalance must be an integer (cents)" });
        }
        if (openingDate !== undefined && openingDate !== null && typeof openingDate !== "string") {
            return res.status(400).json({ message: "openingDate must be an ISO string or null" });
        }

        const account = await service.createNewAccount(req.user.publicId, {
            name,
            type,
            openingBalance,
            openingDate,
            description,
        });

        return res.status(201).json({ account });
    } catch (e: any) {
        const status = /invalid/i.test(String(e?.message)) ? 400 : 500;
        console.error("[accounts] create error:", e);
        return res.status(status).json({ message: e?.message ?? "Server error" });
    }
};

/** PUT /accounts/:id
 * Body: { name?, type?, openingBalance?, openingDate?, description? }
 */
export const updateAccount: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid account id" });

        const { name, type, openingBalance, openingDate, description } = req.body || {};

        if (openingBalance !== undefined && !isInt(openingBalance)) {
            return res.status(400).json({ message: "openingBalance must be an integer (cents)" });
        }
        if (openingDate !== undefined && openingDate !== null && typeof openingDate !== "string") {
            return res.status(400).json({ message: "openingDate must be an ISO string or null" });
        }

        const account = await service.updateExistingAccount(req.user.publicId, {
            id,
            name,
            type,
            openingBalance,
            openingDate,
            description,
        });

        return res.json({ account });
    } catch (e: any) {
        const status = /not found/i.test(String(e?.message))
            ? 404
            : /invalid/i.test(String(e?.message))
                ? 400
                : 500;
        console.error("[accounts] update error:", e);
        return res.status(status).json({ message: e?.message ?? "Server error" });
    }
};

/** DELETE /accounts/:id */
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

/** GET /accounts/:id/current-balance
 * Returns computed balance = openingBalance + SUM(transactions from openingDate)
 */
export const getBalance: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid account id" });
        const currentBalance = await service.getCurrentBalance(req.user.publicId, id);
        // prefer explicit property name to avoid confusion with openingBalance
        return res.json({ accountId: id, currentBalance });
    } catch (e: any) {
        const status = /not found/i.test(String(e?.message)) ? 404 : 500;
        console.error("[accounts] current-balance error:", e);
        return res.status(status).json({ message: e?.message ?? "Server error" });
    }
};
