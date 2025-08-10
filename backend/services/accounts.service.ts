import * as accountRepository from '../repositories/accounts.repository';
import { type Account, type CreateAccountDto, type UpdateAccountDto } from '../types/accounts';

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
    const validTypes = ['checking', 'savings', 'credit', 'investment', 'other'];
    if (!validTypes.includes(accountData.account_type)) {
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