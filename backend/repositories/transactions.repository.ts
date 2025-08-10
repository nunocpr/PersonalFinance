import pool from '../config/db';
import { type Transaction } from '../types/transactions';

export const findAll = async () => {
    const result = await pool.query<Transaction>(
        'SELECT * FROM fin_transactions ORDER BY transaction_date DESC'
    );
    return result.rows;
};

export const create = async (transaction: Omit<Transaction, 'transaction_id'>) => {
    const result = await pool.query<Transaction>(
        `INSERT INTO fin_transactions (
      transaction_date, transaction_amount, transaction_description,
      transaction_is_saving, transaction_category_id,
      transaction_account_id, transaction_income_source_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
            transaction.transaction_date,
            transaction.transaction_amount,
            transaction.transaction_description,
            transaction.transaction_is_saving,
            transaction.transaction_category_id,
            transaction.transaction_account_id,
            transaction.transaction_income_source_id,
        ]
    );
    return result.rows[0];
};