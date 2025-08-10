export interface Account {
    id: number;
    name: string;
    type: string;
    balance: number; // in cents
    description?: string;
    isDeleted?: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    userId: number;
}

export interface CreateAccountDto {
    name: string;
    type: string;
    balance?: number;
    description?: string;
}

export interface UpdateAccountDto {
    name?: string;
    type?: string;
    balance?: number;
    description?: string;
}

export const accountTypes = [
    { value: 'checking', label: 'Checking Account' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'investment', label: 'Investment Account' },
    { value: 'other', label: 'Other' },
];