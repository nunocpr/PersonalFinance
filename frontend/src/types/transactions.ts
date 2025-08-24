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
    accountId?: number;
    categoryId?: number;
    q?: string;
    from?: string;
    to?: string;
    sortBy?: "date" | "amount";
    sortDir?: "asc" | "desc";
    page?: number;
    pageSize?: number;
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
