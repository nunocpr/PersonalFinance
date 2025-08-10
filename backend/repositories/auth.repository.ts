import pool from "../config/db";
import { User } from "../types/auth";

export const findUserByEmail = async (email: string): Promise<User | null> => {
    const result = await pool.query<User>("SELECT * FROM fin_users WHERE user_email = $1", [email]);
    return result.rows[0] || null;
};

export const findUserByPublicId = async (publicId: string): Promise<User | null> => {
    const result = await pool.query<User>(
        `SELECT * FROM fin_users WHERE user_public_id = $1::uuid`,
        [publicId]
    );
    return result.rows[0] || null;
};

export const createUser = async (email: string, hash: string, name: string) => {
    const result = await pool.query<User>(
        `INSERT INTO fin_users (
       user_email, user_password_hash, user_name, user_is_active, user_email_verified
     ) VALUES ($1, $2, $3, true, false)
     RETURNING *`,
        [email, hash, name]
    );
    return result.rows[0];
};

export const setEmailVerification = async (
    userId: number,
    tokenHash: string,
    expiresAt: Date
): Promise<void> => {
    await pool.query(
        `UPDATE fin_users
       SET user_email_token = $1,
           user_email_token_expires_at = $2,
           user_updated_at = NOW()
     WHERE user_id = $3`,
        [tokenHash, expiresAt, userId]
    );
};

// repositories/auth.repository.ts
export const verifyEmailWithToken = async (publicId: string, tokenHash: string) => {
    const result = await pool.query<User>(
        `UPDATE fin_users
       SET user_email_verified = true,
           user_email_token = NULL,
           user_email_token_expires_at = NULL,
           user_updated_at = NOW()
     WHERE user_public_id = $1::uuid
       AND user_email_token = $2
       AND user_email_token_expires_at IS NOT NULL
       AND user_email_token_expires_at > NOW()
     RETURNING *`,
        [publicId, tokenHash]
    );
    return result.rows[0] || null;
};

export const setPasswordResetToken = async (
    userId: number,
    tokenHash: string,
    expiresAt: Date
): Promise<void> => {
    await pool.query(
        `UPDATE fin_users
       SET user_reset_token = $1,
           user_reset_token_expires_at = $2,
           user_updated_at = NOW()
     WHERE user_id = $3`,
        [tokenHash, expiresAt, userId]
    );
};

export const getUserByPublicId = async (publicId: string): Promise<User | null> => {
    const r = await pool.query<User>(
        `SELECT * FROM fin_users WHERE user_public_id = $1::uuid`,
        [publicId]
    );
    return r.rows[0] ?? null;
};

export const resetPasswordUsingToken = async (
    publicId: string,
    tokenHash: string,
    newPasswordHash: string
): Promise<User | null> => {
    const r = await pool.query<User>(
        `UPDATE fin_users
        SET user_password_hash = $3,
            user_reset_token = NULL,
            user_reset_token_expires_at = NULL,
            user_updated_at = NOW()
      WHERE user_public_id = $1::uuid
        AND user_reset_token = $2
        AND (user_reset_token_expires_at IS NOT NULL AND user_reset_token_expires_at > NOW())
      RETURNING *`,
        [publicId, tokenHash, newPasswordHash]
    );
    return r.rows[0] ?? null;
};