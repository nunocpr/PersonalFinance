// services/accounts.service.ts
import * as accountRepository from '../repositories/accounts.repository';

// Use the model type from Prisma
import type { Account } from '../generated/prisma';

// Make sure your DTOs are camelCase in ../types/accounts
import type { CreateAccountDto, UpdateAccountDto } from '../types/accounts';

export const getAllAccounts = async (userId: number): Promise<Account[]> => {
    return accountRepository.findAllAccounts(userId);
};

export const getAccountById = async (id: number, userId: number): Promise<Account> => {
    const account = await accountRepository.findAccountById(id, userId);
    if (!account) {
        throw new Error('Account not found');
    }
    return account;
};

export const createNewAccount = async (accountData: CreateAccountDto): Promise<Account> => {
    // Validate account type
    const validTypes = ['checking', 'savings', 'credit', 'investment', 'other'] as const;
    if (!validTypes.includes(accountData.type as any)) {
        throw new Error('Invalid account type');
    }

    return accountRepository.createAccount(accountData);
};

export const updateExistingAccount = async (
    id: number,
    userId: number,
    accountData: UpdateAccountDto
): Promise<Account> => {
    return accountRepository.updateAccount(id, userId, accountData);
};

export const deleteAccount = async (id: number, userId: number): Promise<void> => {
    return accountRepository.softDeleteAccount(id, userId);
};

export const getAccountBalance = async (id: number, userId: number): Promise<number> => {
    return accountRepository.getAccountBalance(id, userId);
};
