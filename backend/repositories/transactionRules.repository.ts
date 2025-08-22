// src/repositories/transactionRules.repository.ts
import prisma from "../config/prisma";
import type { Prisma, TransactionRule, TransactionKind } from "../generated/prisma";

export type RuleCreateInput = {
    name: string;
    pattern: string;
    isRegex?: boolean;
    caseSensitive?: boolean;
    isActive?: boolean;
    priority?: number;
    categoryId?: number | null;
    kind?: TransactionKind | null;
};

export type RuleUpdateInput = Partial<RuleCreateInput>;

// List all rules for the user (ordered for matching)
export async function list(userPublicId: string): Promise<TransactionRule[]> {
    return prisma.transactionRule.findMany({
        where: { user: { publicId: userPublicId } },
        orderBy: [{ priority: "asc" }, { id: "asc" }],
    });
}

// Create a rule for the user
export async function create(userPublicId: string, dto: RuleCreateInput): Promise<TransactionRule> {
    const user = await prisma.user.findUnique({ where: { publicId: userPublicId }, select: { id: true } });
    if (!user) throw new Error("Unauthorized");

    return prisma.transactionRule.create({
        data: {
            userId: user.id,
            name: dto.name,
            pattern: dto.pattern,
            isRegex: !!dto.isRegex,
            caseSensitive: !!dto.caseSensitive,
            isActive: dto.isActive ?? true,
            priority: dto.priority ?? 100,
            categoryId: dto.categoryId ?? null,
            kind: dto.kind ?? null,
        },
    });
}

// Update a rule (ownership enforced by where clause)
export async function update(userPublicId: string, id: number, patch: RuleUpdateInput): Promise<TransactionRule> {
    const user = await prisma.user.findUnique({ where: { publicId: userPublicId }, select: { id: true } });
    if (!user) throw new Error("Unauthorized");

    const { count } = await prisma.transactionRule.updateMany({
        where: { id, userId: user.id },
        data: {
            name: patch.name,
            pattern: patch.pattern,
            isRegex: patch.isRegex,
            caseSensitive: patch.caseSensitive,
            isActive: patch.isActive,
            priority: patch.priority,
            categoryId: patch.categoryId,
            kind: patch.kind ?? null,
            updatedAt: new Date(),
        },
    });
    if (count === 0) throw new Error("Regra não encontrada.");

    return prisma.transactionRule.findFirstOrThrow({ where: { id, userId: user.id } });
}

// Delete a rule
export async function remove(userPublicId: string, id: number): Promise<void> {
    const user = await prisma.user.findUnique({ where: { publicId: userPublicId }, select: { id: true } });
    if (!user) throw new Error("Unauthorized");

    const { count } = await prisma.transactionRule.deleteMany({
        where: { id, userId: user.id },
    });
    if (count === 0) throw new Error("Regra não encontrada.");
}

// Reorder by setting sequential priorities in a single transaction
export async function reorder(userPublicId: string, orderedIds: number[]): Promise<void> {
    const user = await prisma.user.findUnique({ where: { publicId: userPublicId }, select: { id: true } });
    if (!user) throw new Error("Unauthorized");

    const rules = await prisma.transactionRule.findMany({
        where: { userId: user.id, id: { in: orderedIds } },
        select: { id: true },
    });
    const exists = new Set(rules.map(r => r.id));
    const safeOrder = orderedIds.filter(id => exists.has(id));

    await prisma.$transaction(
        safeOrder.map((id, idx) =>
            prisma.transactionRule.update({ where: { id }, data: { priority: (idx + 1) * 10 } })
        )
    );
}
