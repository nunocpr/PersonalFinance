import crypto from "crypto";

export function sha256(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
}

export type GenerateTokenOptions = {
    /** Number of random bytes before hex-encoding. Defaults to 32 (64 hex chars). */
    bytes?: number;
    /** Time to live in milliseconds (required). */
    ttlMs: number;
};

export function generateToken({ bytes = 32, ttlMs }: GenerateTokenOptions) {
    const token = crypto.randomBytes(bytes).toString("hex"); // send to user
    const tokenHash = sha256(token);                         // store in DB
    const expiresAt = new Date(Date.now() + ttlMs);
    return { token, tokenHash, expiresAt };
}

// tiny helpers for readability
export const ms = {
    minutes: (m: number) => m * 60_000,
    hours: (h: number) => h * 3_600_000,
};
