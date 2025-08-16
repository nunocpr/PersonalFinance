// src/utils/money.ts
// Format numbers as EUR (PT-PT). Works with number or bigint.
// If your API returns cents, pass { cents: true } to divide by 100.
export function formatEUR(
    value: number | bigint,
    opts: { cents?: boolean; minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
    const { cents = false, minimumFractionDigits = 2, maximumFractionDigits = 2 } = opts;

    let n = typeof value === "bigint" ? Number(value) : value;
    if (!Number.isFinite(n)) n = 0;
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

/**
 * Parse a PT-PT money input (e.g., "10.000,20" or "10000,20" or "10000.20")
 * into integer cents. Returns 0 on invalid.
 */
export function parseEURToCents(input: string | number | null | undefined): number {
    if (input == null) return 0;
    let s = String(input).trim();
    if (!s) return 0;

    // remove spaces
    s = s.replace(/\s/g, "");

    const negative = s.startsWith("-");
    if (negative) s = s.slice(1);

    // If both comma and dot exist, we assume comma is the decimal sep and dots are thousands.
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "");

    // Decide decimal separator: prefer comma; if not present and dot is, use dot.
    const dec = s.includes(",") ? "," : s.includes(".") ? "." : null;

    let intPart = s;
    let fracPart = "";

    if (dec) {
        const parts = s.split(dec);
        intPart = parts[0] || "0";
        fracPart = (parts[1] || "").replace(/\D/g, "");
    }

    intPart = intPart.replace(/\D/g, "") || "0";
    fracPart = (fracPart + "00").slice(0, 2); // force 2 decimals

    const cents = Number(intPart) * 100 + Number(fracPart || "0");
    if (!Number.isFinite(cents)) return 0;

    return negative ? -cents : cents;
}

/** For editing inputs: turn cents into "10.000,20" (no currency sign) */
export function centsToInputEUR(cents: number | bigint): string {
    let n = typeof cents === "bigint" ? Number(cents) : cents;
    if (!Number.isFinite(n)) n = 0;
    const euros = n / 100;
    return new Intl.NumberFormat("pt-PT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(euros);
}