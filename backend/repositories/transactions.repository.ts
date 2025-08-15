import prisma from "../config/prisma";
import type { Transaction } from "../generated/prisma";
import type { Transaction as TxDto } from "../types/transactions";

// Get all transactions (you may later scope by user)
export async function findAll(): Promise<Transaction[]> {
    return prisma.transaction.findMany({
        orderBy: { date: "desc" },
    });
}

// Create a transaction from your DTO shape
export async function create(
    t: Omit<TxDto, "transaction_id">
): Promise<Transaction> {
    return prisma.transaction.create({
        data: {
            date: new Date(t.transaction_date),
            amount: BigInt(t.transaction_amount),
            description: t.transaction_description,
            isSaving: t.transaction_is_saving ?? false,
            notes: t.transaction_notes ?? null,
            categoryId: t.transaction_category_id ?? null,
            accountId: t.transaction_account_id,
            incomeSourceId: t.transaction_income_source_id ?? null,
        },
    });
}
