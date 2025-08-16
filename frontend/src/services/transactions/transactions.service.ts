// src/services/transactions/transactions.service.ts
import client from "@/services/api/client";
import type { TxCreateDto, TxFilters, TxUpdateDto, TxListResponse, Transaction } from "@/types/transactions";

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
        const safe = {
            ...patch,
            ...(patch.description === null ? { description: "" } : {})
        };
        const { data } = await client.put<Transaction>(`/transactions/${id}`, safe);
        return data;
    },
    async remove(id: string | number): Promise<void> {
        await client.delete(`/transactions/${id}`);
    },
};
