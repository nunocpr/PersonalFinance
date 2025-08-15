// types/accounts.ts

import { centsToMoney } from "../utils/money";

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'other';

export interface AccountDto {
    id: number;
    name: string;
    type: AccountType;
    balance: number;
    description: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface CreateInput {
    id: number;
    name: string;
    type: AccountType;
    balance?: number;            // cents (or units) — your choice
    description?: string | null;
}

export type UpdateInput = Partial<CreateInput>;


export const toDto = (a: any): AccountDto => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance),
    description: a.description ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
});
