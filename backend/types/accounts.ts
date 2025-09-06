// backend/types/accounts.ts

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'other';

export interface AccountDto {
    id: number;
    name: string;
    type: AccountType;
    openingBalance: number;
    openingDate: string | null;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateInput {
    name: string;
    type: AccountType;
    openingBalance?: number;
    openingDate?: string | null;
    description?: string | null;
}

export interface UpdateInput {
    id: number;
    name?: string;
    type?: AccountType;
    openingBalance?: number;
    openingDate?: string | null;
    description?: string | null;
}

export const toDto = (a: any): AccountDto => ({
    id: a.id,
    name: a.name,
    type: a.type,
    openingBalance: Number(a.openingBalance ?? 0),
    openingDate: a.openingDate ? new Date(a.openingDate).toISOString() : null,
    description: a.description ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
});
