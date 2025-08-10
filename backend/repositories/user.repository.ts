import pool from "../config/db";
import { User } from "../types/auth";

export const findById = async (id: number): Promise<User | null> => {
    const r = await pool.query<User>("SELECT * FROM fin_users WHERE user_id = $1", [id]);
    return r.rows[0] ?? null;
};

export const updateName = async (id: number, name: string): Promise<User> => {
    const r = await pool.query<User>(
        `UPDATE fin_users
       SET user_name = $2,
           user_updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
        [id, name]
    );
    return r.rows[0];
};

export const updatePasswordHash = async (id: number, hash: string): Promise<void> => {
    await pool.query(
        `UPDATE fin_users
       SET user_password_hash = $2,
           user_updated_at = NOW()
     WHERE user_id = $1`,
        [id, hash]
    );
};
