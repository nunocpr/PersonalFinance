import * as repo from "../repositories/category.repository";
import type { Category } from "@prisma/client";
import type { CreateCategoryInput } from "../repositories/category.repository";

export const VALID_KINDS = ["expense", "income", "transfer"] as const;
export type CategoryKind = typeof VALID_KINDS[number];

export async function getTree(userPublicId: string): Promise<Category[]> {
    return repo.listTree(userPublicId);
}

export async function create(
    userPublicId: string,
    input: CreateCategoryInput
): Promise<Category> {
    if (!input.name?.trim()) throw new Error("Nome obrigatório");
    if (input.type && !VALID_KINDS.includes(input.type as CategoryKind)) {
        throw new Error("Tipo inválido");
    }
    return repo.create(userPublicId, input);
}

export async function update(
    userPublicId: string,
    id: number,
    patch: Partial<Pick<Category, "name" | "description" | "icon" | "color" | "type" | "archived">>
): Promise<Category> {
    if (patch.type && !VALID_KINDS.includes(patch.type as CategoryKind)) {
        throw new Error("Tipo inválido");
    }
    if (patch.name != null && !String(patch.name).trim()) {
        throw new Error("Nome inválido");
    }
    return repo.update(userPublicId, id, patch);
}

export async function move(
    userPublicId: string,
    id: number,
    newParentId: number | null
): Promise<Category> {
    return repo.move(userPublicId, id, newParentId);
}

export async function reorder(
    userPublicId: string,
    parentId: number | null,
    orderedIds: number[]
): Promise<void> {
    if (!Array.isArray(orderedIds) || !orderedIds.every(Number.isInteger)) {
        throw new Error("orderedIds inválidos");
    }
    return repo.reorderSiblings(userPublicId, parentId, orderedIds);
}

export async function archive(userPublicId: string, id: number): Promise<Category> {
    return repo.archive(userPublicId, id);
}

export async function hardDelete(userPublicId: string, id: number): Promise<void> {
    return repo.hardDelete(userPublicId, id);
}
