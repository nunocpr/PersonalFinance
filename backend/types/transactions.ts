import { TransactionKind } from "@prisma/client";

// types/transactions.ts
export type SortDir = "asc" | "desc";

export type ListFilters = {
    page?: number;
    pageSize?: number;
    accountId?: number;
    categoryId?: number;
    from?: string;
    to?: string;
    q?: string;
    sortBy?: "date" | "amount" | "createdAt";
    sortDir?: SortDir;
};

export type CreateInput = {
    date?: string;
    amount: number;
    description: string;
    accountId: number;
    categoryId?: number | null;
    incomeSourceId?: number | null;
    isSaving?: boolean;
    notes?: string | null;
    kind?: TransactionKind | null;
};

export type UpdateInput = Partial<CreateInput>;

export type TransferInput = {
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    date?: string;
    description?: string | null;
    notes?: string | null;
};

