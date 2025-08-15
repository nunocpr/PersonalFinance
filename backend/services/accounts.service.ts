// backend/services/accounts.service.ts
import * as repo from "../repositories/accounts.repository";

export type AccountDto = {
    id: number;
    name: string;
    type: string;
    balance: number;            // number (converted from BigInt)
    description: string | null;
    createdAt: string;          // ISO strings are friendly client-side
    updatedAt: string;
};

const toDto = (a: any): AccountDto => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance),            // <- avoid BigInt in JSON
    description: a.description ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
});

export async function getAllAccounts(userPublicId: string): Promise<AccountDto[]> {
    const rows = await repo.findAllAccounts(userPublicId);
    return rows.map(toDto);
}

export async function getAccountById(
    userPublicId: string,
    id: number
): Promise<AccountDto> {
    const row = await repo.findAccountById(userPublicId, id);
    if (!row) throw new Error("Account not found");
    return toDto(row);
}

export async function createNewAccount(
    userPublicId: string,
    data: { name: string; type: string; balance?: number; description?: string | null }
): Promise<AccountDto> {
    const valid = ["checking", "savings", "credit", "investment", "other"];
    if (!valid.includes(data.type)) throw new Error("Invalid account type");
    const row = await repo.createAccount(userPublicId, data);
    return toDto(row);
}

export async function updateExistingAccount(
    userPublicId: string,
    data: { id: number; name?: string; type?: string; balance?: number; description?: string | null }
): Promise<AccountDto> {
    if (data.type) {
        const valid = ["checking", "savings", "credit", "investment", "other"];
        if (!valid.includes(data.type)) throw new Error("Invalid account type");
    }
    const row = await repo.updateAccount(userPublicId, data);
    return toDto(row);
}

export async function deleteAccount(
    userPublicId: string,
    id: number
): Promise<void> {
    await repo.softDeleteAccount(userPublicId, id);
}

export async function getAccountBalance(
    userPublicId: string,
    id: number
): Promise<number> {
    const bal = await repo.getAccountBalance(userPublicId, id);
    return Number(bal);
}
