// src/types/transactions.ts
export interface Transaction {
    transaction_id: string;
    transaction_date: Date;
    transaction_amount: number;
    transaction_description: string;
    transaction_is_saving: boolean;
    transaction_notes?: string;
    transaction_category_id?: number;
    transaction_account_id: number;
    transaction_income_source_id?: number;
    transaction_recurring_transaction_id?: string;
    transaction_created_at: Date;
    transaction_updated_at: Date;
}