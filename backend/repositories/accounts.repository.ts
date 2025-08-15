// backend/repositories/accounts.repository.ts
import prisma from "../config/prisma";
import type { Account } from "../generated/prisma";

export type CreateInput = {
    name: string;
    type: string;
    balance?: number;            // assume cents or units (your choice)
    description?: string | null;
};

export type UpdateInput = {
    id: number;                  // REQUIRED for updates
    name?: string;
    type?: string;
    balance?: number;
    description?: string | null;
};

/** List all non-deleted accounts for a user (by publicId) */
export async function findAllAccounts(userPublicId: string): Promise<Account[]> {
    return prisma.account.findMany({
        where: { isDeleted: false, user: { publicId: userPublicId } },
        orderBy: { createdAt: "asc" },
    });
}

/** Find one account (by user publicId + account id) */
export async function findAccountById(
    userPublicId: string,
    id: number
): Promise<Account | null> {
    return prisma.account.findFirst({
        where: { id, isDeleted: false, user: { publicId: userPublicId } },
    });
}

/** Create account for a user (by publicId) */
export async function createAccount(
    userPublicId: string,
    dto: CreateInput
): Promise<Account> {
    return prisma.account.create({
        data: {
            name: dto.name,
            type: dto.type,
            balance: BigInt(dto.balance ?? 0),
            description: dto.description ?? null,
            user: { connect: { publicId: userPublicId } },
        },
    });
}

/** Update account (scoped by userPublicId for safety) */
export async function updateAccount(
    userPublicId: string,
    dto: UpdateInput
): Promise<Account> {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.balance !== undefined) data.balance = BigInt(dto.balance);
    if (dto.description !== undefined) data.description = dto.description;

    const { count } = await prisma.account.updateMany({
        where: { id: dto.id, isDeleted: false, user: { publicId: userPublicId } },
        data,
    });
    if (count === 0) throw new Error("Account not found or not owned by user");

    return prisma.account.findFirstOrThrow({
        where: { id: dto.id, user: { publicId: userPublicId } },
    });
}

/** Soft delete */
export async function softDeleteAccount(
    userPublicId: string,
    id: number
): Promise<void> {
    const { count } = await prisma.account.updateMany({
        where: { id, isDeleted: false, user: { publicId: userPublicId } },
        data: { isDeleted: true, deletedAt: new Date() },
    });
    if (count === 0) throw new Error("Account not found or not owned by user");
}

/** Get balance (BigInt) */
export async function getAccountBalance(
    userPublicId: string,
    id: number
): Promise<bigint> {
    const acc = await prisma.account.findFirst({
        where: { id, isDeleted: false, user: { publicId: userPublicId } },
        select: { balance: true },
    });
    if (!acc) throw new Error("Account not found or not owned by user");
    return acc.balance;
}
