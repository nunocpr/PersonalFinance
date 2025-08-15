import { RequestHandler } from "express";
import * as transactionService from "../services/transactions.service";

function isErrorWithMessage(error: unknown): error is { message: string } {
    return (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as Record<string, unknown>).message === "string"
    );
}

export const getTransactions: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        // If you want to filter transactions by user:
        const transactions = await transactionService.getAllTransactions();
        res.json(transactions);
    } catch (error) {
        const errorMessage = isErrorWithMessage(error) ? error.message : "Unknown error occurred";
        res.status(500).json({ message: errorMessage });
    }
};

export const createTransaction: RequestHandler = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });

        const newTransaction = await transactionService.createTransaction(req.body);
        res.status(201).json(newTransaction);
    } catch (error) {
        const errorMessage = isErrorWithMessage(error) ? error.message : "Invalid transaction data";
        res.status(400).json({ message: errorMessage });
    }
};
