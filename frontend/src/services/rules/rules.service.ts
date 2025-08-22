// src/services/rules/rules.service.ts
import client from "@/services/api/client";
import type { TxRule, CreateRuleDto, UpdateRuleDto } from "@/types/rules";

export const RulesService = {
    async list(): Promise<TxRule[]> {
        const { data } = await client.get<TxRule[]>("/transaction-rules");
        return data || [];
    },
    async create(payload: CreateRuleDto): Promise<TxRule> {
        const { data } = await client.post<TxRule>("/transaction-rules", payload);
        return data;
    },
    async update(id: number, patch: UpdateRuleDto): Promise<TxRule> {
        const { data } = await client.put<TxRule>(`/transaction-rules/${id}`, patch);
        return data;
    },
    async remove(id: number): Promise<void> {
        await client.delete(`/transaction-rules/${id}`);
    },
    // Optional endpoint to reorder by priority (highest first or lowest first – your backend decides).
    async reorder(ids: number[]): Promise<void> {
        await client.post(`/transaction-rules/reorder`, { ids });
    },
};
