import pool from '../config/db';
import { Account, CreateAccountDto, UpdateAccountDto } from '../types/accounts';

function isValidValue(value: any): value is string | number | Date {
    return typeof value === 'string' ||
        typeof value === 'number' ||
        value instanceof Date;
}

type SqlValue = string | number | Date | boolean | null;
const values: SqlValue[] = [];

export const findAllAccounts = async (userId: number): Promise<Account[]> => {
    const result = await pool.query<Account>(
        'SELECT * FROM fin_accounts WHERE user_id = $1 AND account_is_deleted = false',
        [userId]
    );
    return result.rows;
};

export const findAccountById = async (id: number, userId: number): Promise<Account | null> => {
    const result = await pool.query<Account>(
        'SELECT * FROM fin_accounts WHERE account_id = $1 AND user_id = $2',
        [id, userId]
    );
    return result.rows[0] || null;
};

export const createAccount = async (accountData: CreateAccountDto): Promise<Account> => {
    const result = await pool.query<Account>(
        `INSERT INTO fin_accounts (
      account_name, account_type, account_balance,
      account_description, user_id
    ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
            accountData.account_name,
            accountData.account_type,
            accountData.account_balance || 0,
            accountData.account_description,
            accountData.user_id
        ]
    );
    return result.rows[0];
};

export const updateAccount = async (
    id: number,
    userId: number,
    accountData: UpdateAccountDto
): Promise<Account> => {
    // Explicitly type the arrays
    const queryParts: string[] = [];
    const values: (string | number | Date)[] = [];
    let paramIndex = 1;

    Object.entries(accountData).forEach(([key, value]) => {
        if (value !== undefined && isValidValue(value)) {
            queryParts.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
    });
    if (queryParts.length === 0) {
        throw new Error('No valid fields to update');
    }

    values.push(id, userId);
    const query = `
    UPDATE fin_accounts 
    SET ${queryParts.join(', ')}, account_updated_at = CURRENT_TIMESTAMP 
    WHERE account_id = $${paramIndex} AND user_id = $${paramIndex + 1}
    RETURNING *
  `;

    const result = await pool.query<Account>(query, values);
    if (result.rows.length === 0) {
        throw new Error('Account not found or user mismatch');
    }
    return result.rows[0];
};

export const softDeleteAccount = async (id: number, userId: number): Promise<void> => {
    const result = await pool.query(
        `UPDATE fin_accounts 
     SET account_is_deleted = true, account_deleted_at = CURRENT_TIMESTAMP 
     WHERE account_id = $1 AND user_id = $2`,
        [id, userId]
    );
    if (result.rowCount === 0) {
        throw new Error('Account not found or user mismatch');
    }
};

export const getAccountBalance = async (id: number, userId: number): Promise<number> => {
    const result = await pool.query<{ account_balance: number }>(
        'SELECT account_balance FROM fin_accounts WHERE account_id = $1 AND user_id = $2',
        [id, userId]
    );
    if (result.rows.length === 0) {
        throw new Error('Account not found or user mismatch');
    }
    return result.rows[0].account_balance;
};