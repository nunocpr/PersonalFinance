// repositories/transactions.repository.ts
import prisma from "../config/prisma";
import type { Transaction } from "../generated/prisma";
import type { ListFilters, CreateInput, UpdateInput } from "../types/transactions";
import type { Prisma } from "../generated/prisma";

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

/** Ownership is enforced by joining through relations on WHERE. */
export async function list(userPublicId: string, f: ListFilters) {
    const page = clamp(Number(f.page || 1), 1, 10_000);
    const pageSize = clamp(Number(f.pageSize || 20), 1, 100);

    const where: Prisma.TransactionWhereInput = {
        account: { user: { publicId: userPublicId } },
        ...(typeof f.accountId === "number" ? { accountId: f.accountId } : {}),
        ...(typeof f.categoryId === "number" ? { categoryId: f.categoryId } : {}),
        ...(f.q ? { description: { contains: f.q, mode: "insensitive" } } : {}),
        ...(f.from || f.to
            ? { date: { ...(f.from ? { gte: new Date(f.from) } : {}), ...(f.to ? { lte: new Date(f.to) } : {}) } }
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

    const items = rows.map(toDto);
    return { items, total, page, pageSize };
}

export async function create(userPublicId: string, dto: CreateInput) {
    // Verify account belongs to user
    const acc = await prisma.account.findFirst({
        where: { id: dto.accountId, user: { publicId: userPublicId }, isDeleted: false },
        select: { id: true },
    });
    if (!acc) throw new Error("Conta inválida.");

    // Optional category ownership check
    if (dto.categoryId != null) {
        const cat = await prisma.category.findFirst({
            where: { id: dto.categoryId, user: { publicId: userPublicId }, archived: false },
            select: { id: true },
        });
        if (!cat) throw new Error("Categoria inválida.");
    }

    if (!Number.isInteger(dto.amount)) throw new Error("Amount must be integer cents");

    const created = await prisma.transaction.create({
        data: {
            date: dto.date ? new Date(dto.date) : new Date(),
            amount: BigInt(dto.amount),
            description: dto.description,
            isSaving: !!dto.isSaving,
            notes: dto.notes ?? null,
            account: { connect: { id: dto.accountId } },
            category: dto.categoryId != null ? { connect: { id: dto.categoryId } } : undefined,
            incomeSource: dto.incomeSourceId != null ? { connect: { id: dto.incomeSourceId } } : undefined,
        },
    });
    return toDto(created);
}

export async function update(userPublicId: string, id: string, patch: UpdateInput) {
    // Ensure ownership through updateMany, then refetch
    const data: any = {};
    if (patch.date !== undefined) data.date = new Date(patch.date);
    if ('amount' in patch && patch.amount !== undefined) {
        if (!Number.isInteger(patch.amount)) throw new Error("Amount must be integer cents");
        data.amount = BigInt(patch.amount);
    }
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.isSaving !== undefined) data.isSaving = !!patch.isSaving;
    if (patch.notes !== undefined) data.notes = patch.notes;

    if (patch.accountId !== undefined) {
        const acc = await prisma.account.findFirst({
            where: { id: patch.accountId, user: { publicId: userPublicId }, isDeleted: false },
            select: { id: true },
        });
        if (!acc) throw new Error("Conta inválida.");
        data.accountId = patch.accountId;
    }

    if (patch.categoryId !== undefined) {
        if (patch.categoryId === null) {
            data.categoryId = null;
        } else {
            const cat = await prisma.category.findFirst({
                where: { id: patch.categoryId, user: { publicId: userPublicId } },
                select: { id: true },
            });
            if (!cat) throw new Error("Categoria inválida.");
            data.categoryId = patch.categoryId;
        }
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
