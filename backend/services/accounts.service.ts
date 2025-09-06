// backend/services/accounts.service.ts
import * as repo from "../repositories/accounts.repository";
import type { AccountDto, CreateInput, UpdateInput } from "../types/accounts";

export async function getAllAccounts(userPublicId: string): Promise<AccountDto[]> {
    return repo.findAllAccounts(userPublicId);
}

export async function getAccountById(userPublicId: string, id: number): Promise<AccountDto> {
    const acc = await repo.findAccountById(userPublicId, id);
    if (!acc) throw new Error("Conta não encontrada.");
    return acc;
}

export async function createNewAccount(userPublicId: string, data: CreateInput): Promise<AccountDto> {
    const valid = ["checking", "savings", "credit", "investment", "other"];
    if (!valid.includes(data.type)) throw new Error("Tipo de conta inválido.");
    return repo.createAccount(userPublicId, data);
}

export async function updateExistingAccount(
    userPublicId: string,
    data: UpdateInput & { id: number }
): Promise<AccountDto> {
    if (data.type) {
        const valid = ["checking", "savings", "credit", "investment", "other"];
        if (!valid.includes(data.type)) throw new Error("Tipo de conta inválido.");
    }
    return repo.updateAccount(userPublicId, data);
}

export async function deleteAccount(userPublicId: string, id: number): Promise<void> {
    await repo.removeAccount(userPublicId, id);
}

/** Current balance (computed), returned as number (cents) */
export async function getCurrentBalance(userPublicId: string, id: number): Promise<number> {
    return repo.computeCurrentBalance(userPublicId, id);
}
