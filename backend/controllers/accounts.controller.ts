import { RequestHandler } from 'express';
import {
    getAllAccounts,
    getAccountById,
    createNewAccount,
    updateExistingAccount,
    deleteAccount,
    getAccountBalance
} from '../services/accounts.service';
import { type CreateAccountDto, type UpdateAccountDto } from '../types/accounts';

export const listAccounts: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" }); // narrows type
        const user = req.user; // now guaranteed
        const accounts = await getAllAccounts(user.user_id);
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : "Server error" });
    }
};

export const getAccount: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const accountId = Number(req.params.id);
        const account = await getAccountById(accountId, req.user.user_id);
        res.json(account);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Account not found";
        res.status(404).json({ message });
    }
};

export const createAccount: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const accountData: CreateAccountDto = {
            ...req.body,
            user_id: req.user.user_id,
        };

        const newAccount = await createNewAccount(accountData);
        res.status(201).json(newAccount);
    } catch (error) {
        const status = error instanceof Error && error.message.includes("Invalid") ? 400 : 500;
        const message = error instanceof Error ? error.message : "Failed to create account";
        res.status(status).json({ message });
    }
};

export const updateAccount: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const accountId = Number(req.params.id);
        if (!Number.isInteger(accountId)) return res.status(400).json({ message: "Invalid account id" });

        const updateData: UpdateAccountDto = req.body;
        const updatedAccount = await updateExistingAccount(accountId, req.user.user_id, updateData);
        res.json(updatedAccount);
    } catch (error) {
        const status = error instanceof Error && error.message.includes("not found") ? 404 : 500;
        const message = error instanceof Error ? error.message : "Failed to update account";
        res.status(status).json({ message });
    }
};

export const removeAccount: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const accountId = Number(req.params.id);
        if (!Number.isInteger(accountId)) return res.status(400).json({ message: "Invalid account id" });

        await deleteAccount(accountId, req.user.user_id);
        res.status(204).send();
    } catch (error) {
        const status = error instanceof Error && error.message.includes("not found") ? 404 : 500;
        const message = error instanceof Error ? error.message : "Failed to delete account";
        res.status(status).json({ message });
    }
};

export const getBalance: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const accountId = Number(req.params.id);
        if (!Number.isInteger(accountId)) return res.status(400).json({ message: "Invalid account id" });

        const balance = await getAccountBalance(accountId, req.user.user_id);
        res.json({ balance });
    } catch (error) {
        const status = error instanceof Error && error.message.includes("not found") ? 404 : 500;
        const message = error instanceof Error ? error.message : "Failed to get balance";
        res.status(status).json({ message });
    }
};
