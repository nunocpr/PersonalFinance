// services/transactions.service.ts
import * as repo from "../repositories/transactions.repository";
import type { ListFilters, CreateInput, UpdateInput } from "../types/transactions";

export const list = (userPublicId: string, f: ListFilters) => repo.list(userPublicId, f);
export const create = (userPublicId: string, dto: CreateInput) => repo.create(userPublicId, dto);
export const update = (userPublicId: string, id: string, patch: UpdateInput) => repo.update(userPublicId, id, patch);
export const remove = (userPublicId: string, id: string) => repo.remove(userPublicId, id);
