// src/services/accounts/accounts.service.ts
import client from "@/services/api/client";
import type { Account, CurrentBalanceResponse } from "@/types/accounts";

export const AccountService = {
    async list(): Promise<Account[]> {
        const { data } = await client.get<{ items: Account[] }>("/accounts");
        return data.items;
    },
    async getById(id: number): Promise<Account> {
        const { data } = await client.get<{ account: Account }>(`/accounts/${id}`);
        return data.account;
    },
    async create(payload: { name: string; type: string; balance?: number; description?: string | null }): Promise<Account> {
        const { data } = await client.post<{ account: Account }>("/accounts", payload);
        return data.account;
    },
    async update(id: number, payload: Partial<{ name: string; type: string; balance: number; description: string | null }>): Promise<Account> {
        const { data } = await client.put<{ account: Account }>(`/accounts/${id}`, payload);
        return data.account;
    },
    async delete(id: number): Promise<void> {
        await client.delete(`/accounts/${id}`);
    },
    async getCurrentBalance(accountId: number): Promise<number> {
        const { data } = await client.get<CurrentBalanceResponse>(`/accounts/${accountId}/current-balance`);
        return Number(data.currentBalance ?? 0);
    },
};
