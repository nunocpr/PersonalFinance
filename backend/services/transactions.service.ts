import * as transactionRepository from '../repositories/transactions.repository';
import { type Transaction } from '../types/transactions';

export const getAllTransactions = async () => {
    return await transactionRepository.findAll();
};

export const createTransaction = async (transactionData: Transaction) => {
    // Add business logic here
    if (transactionData.transaction_amount <= 0) {
        throw new Error('Amount must be positive');
    }
    return await transactionRepository.create(transactionData);
};