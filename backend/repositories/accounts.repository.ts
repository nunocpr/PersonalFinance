import prisma from "../config/prisma";
import type { Account } from "../generated/prisma";
import type { CreateAccountDto, UpdateAccountDto } from "../types/accounts";

// List accounts (only non-deleted)
export async function findAllAccounts(userId: number): Promise<Account[]> {
    return prisma.account.findMany({
        where: { userId, isDeleted: false },
        orderBy: { createdAt: "desc" },
    });
}

export async function findAccountById(id: number, userId: number): Promise<Account | null> {
    return prisma.account.findFirst({
        where: { id, userId },
    });
}

export async function createAccount(dto: CreateAccountDto): Promise<Account> {
    return prisma.account.create({
        data: {
            name: dto.name,
            type: dto.type,
            balance: BigInt(dto.balance ?? 0),
            description: dto.description ?? null,
            userId: dto.userId,
        },
    });
}

export async function updateAccount(
    id: number,
    userId: number,
    dto: UpdateAccountDto
): Promise<Account> {
    // Build partial data map safely
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.balance !== undefined) data.balance = BigInt(dto.balance);
    if (dto.description !== undefined) data.description = dto.description;
    data.updatedAt = new Date();

    // Use updateMany to include userId in the filter, then re-fetch
    const { count } = await prisma.account.updateMany({
        where: { id, userId },
        data,
    });
    if (count === 0) throw new Error("Account not found or user mismatch");

    const updated = await prisma.account.findUnique({ where: { id } });
    // `findUnique` can be null theoretically—guard:
    if (!updated) throw new Error("Account not found after update");
    return updated;
}

export async function softDeleteAccount(id: number, userId: number): Promise<void> {
    const { count } = await prisma.account.updateMany({
        where: { id, userId },
        data: { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() },
    });
    if (count === 0) throw new Error("Account not found or user mismatch");
}

export async function getAccountBalance(id: number, userId: number): Promise<number> {
    const acc = await prisma.account.findFirst({
        where: { id, userId },
        select: { balance: true },
    });
    if (!acc) throw new Error("Account not found or user mismatch");
    // Prisma maps BIGINT to JS bigint; convert to number (your balances are in cents).
    return Number(acc.balance);
}
