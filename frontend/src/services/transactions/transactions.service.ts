// src/services/transactions/transactions.service.ts
import client from "@/services/api/client";
import type {
    TxCreateDto,
    TxFilters,
    TxUpdateDto,
    TxListResponse,
    Transaction,
    TransferCreateDto,
} from "@/types/transactions";

export const TransactionService = {
    async list(filters: TxFilters): Promise<TxListResponse> {
        const { data } = await client.get<TxListResponse>("/transactions", { params: filters });
        return data;
    },

    async create(payload: TxCreateDto): Promise<Transaction> {
        const safe = { ...payload, description: payload.description ?? "" };
        const { data } = await client.post<Transaction>("/transactions", safe);
        return data;
    },

    async update(id: string | number, patch: TxUpdateDto): Promise<Transaction> {
        const safe = { ...patch, ...(patch.description === null ? { description: "" } : {}) };
        const { data } = await client.put<Transaction>(`/transactions/${id}`, safe);
        return data;
    },

    async remove(id: string | number): Promise<void> {
        await client.delete(`/transactions/${id}`);
    },

    async groupByCategory(params: TxFilters & { accountId: number }) {
        const { data } = await client.get("/transactions/group-by-category", { params });
        return data as {
            groups: Array<{
                categoryId: number | null;
                count: number;
                sum: number;
                minDate: string | null;
                maxDate: string | null;
                categoryName: string | null;
                parentName: string | null;
                color: string | null;
                items?: any[]; // when backend includes per-group items
            }>;
        };
    },

    /* ─────────────── transfers & balances ─────────────── */

    async getBalance(accountId: number) {
        const { data } = await client.get(`/transactions/balances/${accountId}`);
        return data as { accountId: number; balance: number };
    },

    async createTransfer(payload: {
        fromAccountId: number;
        toAccountId: number;
        amount: number; // cents
        date?: string;
        description?: string | null;
        notes?: string | null;
    }) {
        const { data } = await client.post("/transactions/transfers", payload);
        return data as { out: Transaction; in: Transaction; transferId: string };
    },

    async listTransfers(params?: { accountId?: number }) {
        const { data } = await client.get("/transactions/transfers", { params });
        return data as { items: Transaction[] };
    },

    async removeTransfer(transferId: string) {
        await client.delete(`/transactions/transfers/${transferId}`);
    },

    async convertToTransfer(payload: {
        txId: string;
        toAccountId: number;
        amount?: number;
        date?: string;
        description?: string | null;
        notes?: string | null;
    }) {
        const { data } = await client.post("/transactions/transfers/convert", payload);
        return data as { transferId: string; source: Transaction; destination: Transaction };
    },
};
