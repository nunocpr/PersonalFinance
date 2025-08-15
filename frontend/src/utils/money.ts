// src/utils/money.ts
// Format numbers as EUR (PT-PT). Works with number or bigint.
// If your API returns cents, pass { cents: true } to divide by 100.
export function formatEUR(
    value: number | bigint,
    opts: { cents?: boolean; minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
    const { cents = false, minimumFractionDigits = 2, maximumFractionDigits = 2 } = opts;

    let n = typeof value === "bigint" ? Number(value) : value;
    if (Number.isNaN(n) || !Number.isFinite(n)) n = 0;

    if (cents) n = n / 100;

    return new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(n);
}

// Optional: convenience helper if you always send cents from the backend
export const formatCentsEUR = (cents: number | bigint) => formatEUR(cents, { cents: true });
