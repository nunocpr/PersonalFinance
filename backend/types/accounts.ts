export interface Account {
    account_id: number;
    account_name: string;
    account_type: string;
    account_balance: number; // in cents
    account_description?: string;
    account_is_deleted?: boolean;
    account_created_at: Date;
    account_updated_at: Date;
    account_deleted_at?: Date;
    user_id: number;
}

export interface CreateAccountDto {
    account_name: string;
    account_type: string;
    account_balance?: number;
    account_description?: string;
    user_id: number;
}

export interface UpdateAccountDto {
    account_name?: string;
    account_type?: string;
    account_balance?: number;
    account_description?: string;
}