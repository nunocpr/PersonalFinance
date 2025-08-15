import apiClient from '@/services/api/client'
import type { Transaction, CreateTransactionDto } from '@/types/transactions';

export const TransactionService = {
    async getById(id: string): Promise<Transaction> {
        const { data } = await apiClient.get(`/transactions/${id}`);
        return data;
    },

    async list(): Promise<Transaction[]> {
        const { data } = await apiClient.get('/transactions');
        return data;
    },

    async create(transaction: CreateTransactionDto): Promise<Transaction> {
        const { data } = await apiClient.post('/transactions', transaction);
        return data;
    },

    async update(id: string, updates: Partial<Transaction>): Promise<Transaction> {
        const { data } = await apiClient.patch(`/transactions/${id}`, updates);
        return data;
    }
};