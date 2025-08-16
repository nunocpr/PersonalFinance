// src/types/transactions.ts
export interface Transaction {
    id: string;
    date: string;
    amount: number;
    description: string;
    isSaving: boolean;
    notes: string | null;
    accountId: number;
    categoryId: number | null;
    incomeSourceId: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface TxListResponse {
    items: Transaction[];
    total: number;
    page: number;
    pageSize: number;
}

export interface TxFilters {
    page?: number;
    pageSize?: number;
    accountId?: number;
    categoryId?: number;
    from?: string;
    to?: string;
    q?: string;
    sortBy?: "date" | "amount" | "createdAt";
    sortDir?: "asc" | "desc";
}

export interface TxCreateDto {
    date?: string;
    amount: number;
    description: string;
    accountId: number;
    categoryId?: number | null;
    incomeSourceId?: number | null;
    isSaving?: boolean;
    notes?: string | null;
}

export type TxUpdateDto = Partial<TxCreateDto>;
