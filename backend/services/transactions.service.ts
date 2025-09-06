// services/transactions.service.ts
import * as repo from "../repositories/transactions.repository";
import type { ListFilters, CreateInput, UpdateInput, TransferInput } from "../types/transactions";

export const list = (userPublicId: string, f: ListFilters) => repo.list(userPublicId, f);
export const groupByCategory = (userPublicId: string, f: ListFilters) => repo.groupByCategory(userPublicId, f);
export const create = (userPublicId: string, dto: CreateInput) => repo.create(userPublicId, dto);
export const update = (userPublicId: string, id: string, patch: UpdateInput) => repo.update(userPublicId, id, patch);
export const remove = (userPublicId: string, id: string) => repo.remove(userPublicId, id);

export const createTransfer = (userPublicId: string, dto: TransferInput) => repo.createTransfer(userPublicId, dto);
export const removeTransfer = (userPublicId: string, transferId: string) => repo.removeTransfer(userPublicId, transferId);
export const listTransfers = (userPublicId: string, accountId?: number) => repo.listTransfers(userPublicId, accountId);
export const convertToTransfer = (userPublicId: string, dto: { txId: string; toAccountId: number; amount?: number; date?: string | Date; description?: string | null; notes?: string | null; }) => repo.convertToTransfer(userPublicId, dto);