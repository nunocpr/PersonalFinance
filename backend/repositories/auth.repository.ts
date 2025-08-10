import pool from "../config/db";
import { User } from "../types/auth";

export const findUserByEmail = async (email: string): Promise<User | null> => {
    const result = await pool.query<User>(
        "SELECT * FROM fin_users WHERE user_email = $1",
        [email]
    );
    return result.rows[0] || null;
};

export const createUser = async (email: string, hash: string, name: string): Promise<User> => {
    const result = await pool.query<User>(
        `INSERT INTO fin_users (user_email, user_password_hash, user_name)
     VALUES ($1, $2, $3) RETURNING *`,
        [email, hash, name]
    );
    return result.rows[0];
};
