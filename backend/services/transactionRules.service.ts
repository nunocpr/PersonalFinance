// src/services/transactionRules.service.ts
import * as repo from "../repositories/transactionRules.repository";
import type { RuleCreateInput, RuleUpdateInput } from "../repositories/transactionRules.repository";

export const list = (userPublicId: string) => repo.list(userPublicId);
export const create = (userPublicId: string, dto: RuleCreateInput) => repo.create(userPublicId, dto);
export const update = (userPublicId: string, id: number, patch: RuleUpdateInput) => repo.update(userPublicId, id, patch);
export const remove = (userPublicId: string, id: number) => repo.remove(userPublicId, id);
export const reorder = (userPublicId: string, ids: number[]) => repo.reorder(userPublicId, ids);
