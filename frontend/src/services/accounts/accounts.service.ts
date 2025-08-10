import apiClient from '@/services/api/client'
import type { Account, CreateAccountDto, UpdateAccountDto } from '@/types/accounts';

export const AccountService = {
    async getAll(): Promise<Account[]> {
        const response = await apiClient.get<Account[]>('/accounts');
        return response.data;
    },

    async getById(id: number): Promise<Account> {
        const response = await apiClient.get<Account>(`/accounts/${id}`);
        return response.data;
    },

    async create(accountData: CreateAccountDto): Promise<Account> {
        const response = await apiClient.post<Account>('/accounts', accountData);
        return response.data;
    },

    async update(id: number, accountData: UpdateAccountDto): Promise<Account> {
        const response = await apiClient.put<Account>(`/accounts/${id}`, accountData);
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await apiClient.delete(`/accounts/${id}`);
    },

    async getBalance(id: number): Promise<number> {
        const response = await apiClient.get<{ balance: number }>(`/accounts/${id}/balance`);
        return response.data.balance;
    }
};