export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'other';

export interface Account {
    id: number;
    name: string;
    type: AccountType;
    openingBalance: number;
    openingDate: string | null;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAccountDto {
    name: string;
    type: AccountType;
    openingBalance?: number;
    openingDate?: string | null;
    description?: string | null;
}

export interface UpdateAccountDto {
    name?: string;
    type?: AccountType;
    openingBalance?: number;
    openingDate?: string | null;
    description?: string | null;
}

export interface CurrentBalanceResponse {
    accountId: number;
    currentBalance: number;
}
