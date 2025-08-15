export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'other';

export interface Account {
    id: number;
    name: string;
    type: AccountType;
    balance: number;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAccountDto {
    name: string;
    type: AccountType;
    balance?: number;
    description?: string | null;
}

export interface UpdateAccountDto {
    name?: string;
    type?: AccountType;
    balance?: number;
    description?: string | null;
}
