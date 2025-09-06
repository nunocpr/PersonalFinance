// repositories/transactions.repository.ts
import prisma from "../config/prisma";
import type { Transaction, TransactionKind } from "../generated/prisma";
import type { ListFilters, CreateInput, UpdateInput, TransferInput } from "../types/transactions";
import type { Prisma } from "../generated/prisma";
import { matchRule, normalizeAmountForKind } from "../utils/ruleMatcher";
import { randomUUID } from "crypto";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// Return a safe DTO to avoid BigInt → JSON issues
export function toDto(t: Transaction) {
    return {
        id: t.id,
        date: t.date,
        amount: Number(t.amount),
        description: t.description,
        isSaving: t.isSaving,
        notes: t.notes ?? null,
        accountId: t.accountId,
        categoryId: t.categoryId ?? null,
        incomeSourceId: t.incomeSourceId ?? null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    };
}

export async function list(userPublicId: string, f: ListFilters) {
    const page = clamp(Number(f.page || 1), 1, 10_000);
    const pageSize = clamp(Number(f.pageSize || 20), 1, 100);

    // allow either a number OR an explicit null for uncategorized
    const hasUncategorized = Object.prototype.hasOwnProperty.call(f, "categoryId") && f.categoryId === null;

    const where: Prisma.TransactionWhereInput = {
        account: { user: { publicId: userPublicId } },
        ...(typeof f.accountId === "number" ? { accountId: f.accountId } : {}),
        ...(typeof f.categoryId === "number"
            ? { categoryId: f.categoryId }
            : hasUncategorized
                ? { categoryId: null }
                : {}),
        ...(f.q ? { description: { contains: f.q, mode: "insensitive" } } : {}),
        ...(f.from || f.to
            ? {
                date: {
                    ...(f.from ? { gte: new Date(f.from) } : {}),
                    ...(f.to ? { lte: new Date(f.to) } : {}),
                },
            }
            : {}),
    };

    const orderBy: Prisma.TransactionOrderByWithRelationInput[] =
        f.sortBy === "amount"
            ? [{ amount: f.sortDir === "asc" ? "asc" : "desc" }, { createdAt: "desc" }]
            : [{ date: f.sortDir === "asc" ? "asc" : "desc" }, { createdAt: "desc" }];

    const [total, rows] = await Promise.all([
        prisma.transaction.count({ where }),
        prisma.transaction.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);

    return { items: rows.map(toDto), total, page, pageSize };
}

export async function groupByCategory(userPublicId: string, f: ListFilters) {
    // Build WHERE the same way you do in list(), but without categoryId —
    // we want ALL categories in the current filter context.
    const where: Prisma.TransactionWhereInput = {
        account: { user: { publicId: userPublicId } },
        ...(typeof f.accountId === "number" ? { accountId: f.accountId } : {}),
        ...(f.q ? { description: { contains: f.q, mode: "insensitive" } } : {}),
        ...(f.from || f.to
            ? {
                date: {
                    ...(f.from ? { gte: new Date(f.from) } : {}),
                    ...(f.to ? { lte: new Date(f.to) } : {}),
                },
            }
            : {}),
    };

    // Keep sort semantics identical to list(); per-group items will respect this order.
    const orderBy: Prisma.TransactionOrderByWithRelationInput[] =
        f.sortBy === "amount"
            ? [{ amount: f.sortDir === "asc" ? "asc" : "desc" }, { createdAt: "desc" }]
            : [{ date: f.sortDir === "asc" ? "asc" : "desc" }, { createdAt: "desc" }];

    // 1) Fetch ALL matching transactions (no pagination)
    const rows = await prisma.transaction.findMany({
        where,
        orderBy,
        select: {
            id: true, date: true, amount: true, description: true, isSaving: true,
            notes: true, accountId: true, categoryId: true, incomeSourceId: true,
            createdAt: true, updatedAt: true,
        },
    });

    // 2) Group in-memory and compute aggregates
    type Acc = {
        items: ReturnType<typeof toDto>[];
        count: number;
        sum: number;
        minDate: Date | null;
        maxDate: Date | null;
    };
    const gmap = new Map<number | null, Acc>();

    for (const r of rows) {
        const key = r.categoryId ?? null;
        const acc = gmap.get(key) ?? { items: [], count: 0, sum: 0, minDate: null, maxDate: null };
        acc.items.push(toDto(r as Transaction));
        acc.count++;
        acc.sum += Number(r.amount); // amount is BigInt in DB; Number() OK for cents
        acc.minDate = acc.minDate ? (r.date < acc.minDate ? r.date : acc.minDate) : r.date;
        acc.maxDate = acc.maxDate ? (r.date > acc.maxDate ? r.date : acc.maxDate) : r.date;
        gmap.set(key, acc);
    }

    // 3) Enrich with category metadata
    const ids = [...gmap.keys()].filter((v): v is number => v != null);
    const cats = ids.length
        ? await prisma.category.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, color: true, parent: { select: { name: true, color: true } } },
        })
        : [];
    const cmap = new Map(cats.map(c => [c.id, c]));

    // 4) Build DTO
    const groups = [...gmap.entries()].map(([categoryId, acc]) => {
        const cat = categoryId != null ? cmap.get(categoryId) : undefined;
        return {
            categoryId, // number | null
            count: acc.count,
            sum: acc.sum,
            minDate: acc.minDate?.toISOString() ?? null,
            maxDate: acc.maxDate?.toISOString() ?? null,
            categoryName: cat?.name ?? null,
            parentName: cat?.parent?.name ?? null,
            color: cat?.color ?? cat?.parent?.color ?? null,
            items: acc.items, // <-- ALL items for this category
        };
    });

    // (Optional) Sort groups here if you want a default order; front-end can still re-sort.
    // Example: sort by label on the client. We return as-is.
    return { groups, total: rows.length };
}

export async function create(userPublicId: string, dto: CreateInput) {
    // Verify account belongs to user
    const acc = await prisma.account.findFirst({
        where: { id: dto.accountId, user: { publicId: userPublicId } },
        select: { id: true },
    });

    if (!acc) throw new Error("Conta inválida.");

    // Optional category ownership check if provided
    if (dto.categoryId != null) {
        const cat = await prisma.category.findFirst({
            where: { id: dto.categoryId, user: { publicId: userPublicId }, archived: false },
            select: { id: true },
        });
        if (!cat) throw new Error("Categoria inválida.");
    }

    if (!Number.isInteger(dto.amount)) throw new Error("Amount must be integer cents");

    // Auto-match rule if no category/kind supplied
    let categoryId = dto.categoryId ?? null;
    let kind: TransactionKind | undefined | null = dto.kind ?? null;

    if (!categoryId || !kind) {
        const rule = await matchRule(userPublicId, dto.description || "");
        if (rule) {
            if (!categoryId && rule.categoryId != null) categoryId = rule.categoryId;
            if (!kind && rule.kind) kind = rule.kind;
        }
    }

    // Derive kind from sign if still missing
    if (!kind) kind = dto.amount < 0 ? "DEBIT" : "CREDIT";

    // Enforce sign-kind consistency
    const normalizedAmount = normalizeAmountForKind(dto.amount, kind);

    const created = await prisma.transaction.create({
        data: {
            date: dto.date ? new Date(dto.date) : new Date(),
            amount: BigInt(normalizedAmount),
            kind,
            description: dto.description,
            isSaving: !!dto.isSaving,
            notes: dto.notes ?? null,
            account: { connect: { id: dto.accountId } },
            category: categoryId != null ? { connect: { id: categoryId } } : undefined,
            incomeSource: dto.incomeSourceId != null ? { connect: { id: dto.incomeSourceId } } : undefined,
        },
    });
    return toDto(created);
}

export async function update(userPublicId: string, id: string, patch: UpdateInput) {
    if (patch.amount !== undefined && !Number.isInteger(patch.amount)) {
        throw new Error("Amount must be integer cents");
    }

    const data: any = {};
    if (patch.date !== undefined) data.date = new Date(patch.date);
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.isSaving !== undefined) data.isSaving = !!patch.isSaving;
    if (patch.notes !== undefined) data.notes = patch.notes;

    // account ownership check (if moving transaction)
    if (patch.accountId !== undefined) {
        const acc = await prisma.account.findFirst({
            where: { id: patch.accountId, user: { publicId: userPublicId } },
            select: { id: true },
        });
        if (!acc) throw new Error("Conta inválida.");
        data.accountId = patch.accountId;
    }

    // category ownership check
    if (patch.categoryId !== undefined) {
        if (patch.categoryId === null) data.categoryId = null;
        else {
            const cat = await prisma.category.findFirst({
                where: { id: patch.categoryId, user: { publicId: userPublicId } },
                select: { id: true },
            });
            if (!cat) throw new Error("Categoria inválida.");
            data.categoryId = patch.categoryId;
        }
    }

    // handle kind + amount consistency
    let amountCents: number | undefined = patch.amount;
    let kind: TransactionKind | undefined = patch.kind as any;

    // If caller supplied neither kind nor amount, we leave them as-is.
    // If one is supplied, normalize the other (when both present, honor both but normalize amount sign).
    if (kind && amountCents === undefined) {
        // fetch current amount to normalize
        const current = await prisma.transaction.findUnique({ where: { id }, select: { amount: true } });
        if (!current) throw new Error("Transação não encontrada.");
        amountCents = Number(current.amount);
    }

    if (amountCents !== undefined && !kind) {
        kind = amountCents < 0 ? "DEBIT" : "CREDIT";
    }

    if (amountCents !== undefined && kind) {
        amountCents = normalizeAmountForKind(amountCents, kind);
        data.amount = BigInt(amountCents);
        data.kind = kind;
    } else if (kind && amountCents === undefined) {
        data.kind = kind;
    } else if (amountCents !== undefined) {
        data.amount = BigInt(amountCents);
    }

    const { count } = await prisma.transaction.updateMany({
        where: { id, account: { user: { publicId: userPublicId } } },
        data,
    });
    if (count === 0) throw new Error("Transação não encontrada.");

    const t = await prisma.transaction.findUniqueOrThrow({ where: { id } });
    return toDto(t);
}

export async function remove(userPublicId: string, id: string) {
    const { count } = await prisma.transaction.deleteMany({
        where: { id, account: { user: { publicId: userPublicId } } },
    });
    if (count === 0) throw new Error("Transação não encontrada.");
}


export async function getCurrentBalance(userPublicId: string, accountId: number) {
    const acc = await prisma.account.findFirst({
        where: { id: accountId, user: { publicId: userPublicId } },
        select: { openingBalance: true, openingDate: true },
    });
    if (!acc) throw new Error("Conta inválida.");

    const where: Prisma.TransactionWhereInput = {
        accountId,
        account: { user: { publicId: userPublicId } },
        ...(acc.openingDate ? { date: { gte: acc.openingDate } } : {}),
    };

    const agg = await prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
    });

    const opening = BigInt(acc.openingBalance ?? 0);
    const delta = BigInt(agg._sum.amount ?? 0);

    return Number(opening + delta);
}

export async function createTransfer(userPublicId: string, dto: TransferInput) {
    if (!Number.isInteger(dto.amount) || dto.amount <= 0) throw new Error("Valor inválido.");
    if (dto.fromAccountId === dto.toAccountId) throw new Error("As contas têm de ser diferentes.");

    // ownership checks
    const [fromAcc, toAcc] = await Promise.all([
        prisma.account.findFirst({ where: { id: dto.fromAccountId, user: { publicId: userPublicId } }, select: { id: true } }),
        prisma.account.findFirst({ where: { id: dto.toAccountId, user: { publicId: userPublicId } }, select: { id: true } }),
    ]);
    if (!fromAcc || !toAcc) throw new Error("Conta inválida.");

    const date = dto.date ? new Date(dto.date) : new Date();
    const transferId = randomUUID();
    const description = dto.description ?? "Transferência";
    const notes = dto.notes ?? null;

    const [debit, credit] = await prisma.$transaction(async (px) => {
        const outTx = await px.transaction.create({
            data: {
                date,
                amount: BigInt(-Math.abs(dto.amount)),
                kind: "DEBIT",
                description,
                isSaving: false,
                notes,
                accountId: dto.fromAccountId,
                transferId,
                // categoryId: optionally set a "Transfer" category you may create later
            },
        });
        const inTx = await px.transaction.create({
            data: {
                date,
                amount: BigInt(Math.abs(dto.amount)),
                kind: "CREDIT",
                description,
                isSaving: false,
                notes,
                accountId: dto.toAccountId,
                transferId,
            },
        });
        return [outTx, inTx];
    });

    return { out: toDto(debit), in: toDto(credit), transferId };
}

export async function removeTransfer(userPublicId: string, transferId: string) {
    const { count } = await prisma.transaction.deleteMany({
        where: { transferId, account: { user: { publicId: userPublicId } } },
    });
    if (count === 0) throw new Error("Transferência não encontrada.");
}

export async function listTransfers(userPublicId: string, accountId?: number) {
    const where: Prisma.TransactionWhereInput = {
        transferId: { not: null },
        account: { user: { publicId: userPublicId } },
        ...(typeof accountId === "number" ? { accountId } : {}),
    };
    const rows = await prisma.transaction.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(toDto);
}

export async function convertToTransfer(
    userPublicId: string,
    dto: {
        txId: string;
        toAccountId: number;
        amount?: number;          // cents, positive override (optional)
        date?: string | Date;     // optional override
        description?: string | null;
        notes?: string | null;
    }
) {
    // Load tx & validate ownership
    const srcTx = await prisma.transaction.findFirst({
        where: { id: dto.txId, account: { user: { publicId: userPublicId } } },
        select: { id: true, date: true, amount: true, kind: true, accountId: true, description: true, notes: true },
    });
    if (!srcTx) throw new Error("Transação não encontrada.");

    // Validate destination account ownership
    const dstAcc = await prisma.account.findFirst({
        where: { id: dto.toAccountId, user: { publicId: userPublicId }, isDeleted: false },
        select: { id: true },
    });
    if (!dstAcc) throw new Error("Conta destino inválida.");
    if (dstAcc.id === srcTx.accountId) throw new Error("Conta destino não pode ser igual à origem.");

    // Final values
    const amount = dto.amount != null ? Math.abs(dto.amount) : Math.abs(Number(srcTx.amount));
    if (!Number.isInteger(amount) || amount <= 0) throw new Error("Valor inválido.");
    const when = dto.date ? new Date(dto.date) : srcTx.date;
    const description = dto.description ?? srcTx.description ?? "Transferência";
    const notes = dto.notes ?? srcTx.notes ?? null;
    const transferId = randomUUID();

    // Counter-leg kind/sign (opposite of source money direction)
    const counterKind = srcTx.kind === "DEBIT" ? "CREDIT" : "DEBIT";
    const counterAmount = counterKind === "CREDIT" ? BigInt(amount) : BigInt(-amount);

    const [updatedSrc, dstTx] = await prisma.$transaction([
        // 1) mark existing tx with transferId (leave original sign/kind as-is)
        prisma.transaction.update({
            where: { id: srcTx.id },
            data: { transferId, date: when, description, notes },
        }),
        // 2) create the counter-leg in the destination account
        prisma.transaction.create({
            data: {
                transferId,
                date: when,
                amount: counterAmount,
                kind: counterKind,
                description,
                isSaving: false,
                notes,
                accountId: dstAcc.id,
            },
        }),
    ]);

    return {
        transferId,
        source: toDto(updatedSrc),
        destination: toDto(dstTx),
    };
}