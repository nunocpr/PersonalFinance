// src/services/transactions/ruleMatcher.ts

import prisma from "../config/prisma";
import { TransactionKind, TransactionRule } from "../generated/prisma";

// Build a predicate for a rule
function buildPredicate(rule: TransactionRule): (txt: string) => boolean {
    const flags = rule.caseSensitive ? "" : "i";
    if (rule.isRegex) {
        const re = new RegExp(rule.pattern, flags);
        return (txt: string) => re.test(txt || "");
    }
    // plain substring
    const needle = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();
    return (txt: string) => {
        const hay = rule.caseSensitive ? (txt || "") : (txt || "").toLowerCase();
        return hay.includes(needle);
    };
}

/** Return first matching rule (by priority asc), or null */
export async function matchRule(userPublicId: string, description: string | null | undefined) {
    if (!description) return null;

    const rules = await prisma.transactionRule.findMany({
        where: { isActive: true, user: { publicId: userPublicId } },
        orderBy: [{ priority: "asc" }, { id: "asc" }],
    });

    for (const r of rules) {
        const pred = buildPredicate(r);
        if (pred(description)) return r;
    }
    return null;
}

/** Normalize amount sign to match kind */
export function normalizeAmountForKind(amountCents: number, kind?: TransactionKind | null): number {
    if (!kind) return amountCents;
    if (kind === "DEBIT") return -Math.abs(amountCents);
    return Math.abs(amountCents); // CREDIT
}
