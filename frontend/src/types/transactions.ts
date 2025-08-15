// src/types/transaction.ts
export interface Transaction {
    transaction_id: string;
    transaction_date: string;
    transaction_amount: number; // in cents
    transaction_description: string;
    transaction_category_id?: number;
    transaction_is_saving: boolean;
    transaction_account_id: number;
    transaction_income_source_id?: number;
    transaction_recurring_transaction_id?: string;
    transaction_created_at?: string;
    transaction_updated_at?: string;
}

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