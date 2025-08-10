export interface Transaction {
    id: string;
    date: string;
    amount: number; // in cents
    description: string;
    isSaving: boolean;
    categoryId?: number;
    accountId: number;
}

export type CreateTransactionDto = Omit<Transaction, 'id'>;
export type UpdateTransactionDto = Partial<CreateTransactionDto>;