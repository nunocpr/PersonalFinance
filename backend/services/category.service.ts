import * as repo from "../repositories/category.repository";
import { CreateCategoryDto, UpdateCategoryDto, ReorderSiblingsDto } from "../types/category";

export const listTree = (userId: string) => repo.listTree(userId);

export const create = (userId: string, dto: CreateCategoryDto) => {
    return repo.create(userId, dto);
};

export const rename = (userId: string, id: number, name: string) => {
    return repo.update(userId, id, { name });
};

export const patch = (userId: string, id: number, dto: UpdateCategoryDto) => {
    return repo.update(userId, id, dto);
};

export const move = (userId: string, id: number, parentId: number | null) => {
    return repo.move(userId, id, parentId);
};

export const reorder = (userId: string, dto: ReorderSiblingsDto) => {
    return repo.reorderSiblings(userId, dto.parentId ?? null, dto.orderedIds);
};

export const archive = (userId: string, id: number) => repo.archive(userId, id);
export const hardDelete = (userId: string, id: number) => repo.hardDelete(userId, id);
