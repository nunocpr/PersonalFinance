// backend/repositories/accounts.repository.ts
import prisma from "../config/prisma";
import type { Prisma } from "@prisma/client";
import type { CreateInput, UpdateInput } from "../types/accounts";
import { toDto } from "../types/accounts";

/** List all accounts for a user */
export async function findAllAccounts(userPublicId: string) {
    const rows = await prisma.account.findMany({
        where: { user: { publicId: userPublicId } },
        orderBy: { createdAt: "asc" },
    });
    return rows.map(toDto);
}

/** Find one account (by user publicId + account id) */
export async function findAccountById(userPublicId: string, id: number) {
    const acc = await prisma.account.findFirst({
        where: { id, user: { publicId: userPublicId } },
    });
    return acc ? toDto(acc) : null;
}

/** Create account */
export async function createAccount(userPublicId: string, dto: CreateInput) {
    const user = await prisma.user.findFirst({
        where: { publicId: userPublicId },
        select: { id: true },
    });
    if (!user) throw new Error("Utilizador inválido.");

    const created = await prisma.account.create({
        data: {
            name: dto.name,
            type: dto.type,
            description: dto.description ?? null,
            openingBalance: BigInt(dto.openingBalance ?? 0),
            openingDate: dto.openingDate ? new Date(dto.openingDate) : null,
            user: { connect: { id: user.id } },
        },
    });

    return toDto(created);
}

/** Update account */
export async function updateAccount(userPublicId: string, dto: UpdateInput & { id: number }) {
    const data: Prisma.AccountUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.openingBalance !== undefined) data.openingBalance = BigInt(dto.openingBalance);
    if (dto.openingDate !== undefined) data.openingDate = dto.openingDate ? new Date(dto.openingDate) : null;

    const { count } = await prisma.account.updateMany({
        where: { id: dto.id, user: { publicId: userPublicId } },
        data,
    });
    if (count === 0) throw new Error("Conta não encontrada.");

    const acc = await prisma.account.findUniqueOrThrow({ where: { id: dto.id } });
    return toDto(acc);
}

/** Hard delete (simple & schema-agnostic). If you want soft-delete, switch to update + isDeleted flags. */
export async function removeAccount(userPublicId: string, id: number) {
    const { count } = await prisma.account.deleteMany({
        where: { id, user: { publicId: userPublicId } },
    });
    if (count === 0) throw new Error("Conta não encontrada.");
}

/** Compute current balance = openingBalance + SUM(transactions since openingDate, inclusive) */
export async function computeCurrentBalance(userPublicId: string, id: number): Promise<number> {
    const acc = await prisma.account.findFirst({
        where: { id, user: { publicId: userPublicId } },
        select: { openingBalance: true, openingDate: false, id: true },
    });
    if (!acc) throw new Error("Conta não encontrada.");

    const whereTx: Prisma.TransactionWhereInput = {
        accountId: id,
        account: { user: { publicId: userPublicId } }
    };

    const agg = await prisma.transaction.aggregate({
        where: whereTx,
        _sum: { amount: true },
    });

    const opening = Number(acc.openingBalance ?? 0n);
    const delta = Number(agg._sum.amount ?? 0n);
    return opening + delta;
}
