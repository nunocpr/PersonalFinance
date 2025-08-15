export function parseMoneyToCents(v: number): bigint {
    // frontend sends decimals in base currency (e.g., 123.45)
    return BigInt(Math.round((v ?? 0) * 100));
}

export function centsToMoney(cents: bigint | number | null | undefined): number {
    const n = typeof cents === "bigint" ? Number(cents) : (cents ?? 0);
    return Math.round(n) / 100;
}