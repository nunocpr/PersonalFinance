// src/services/categories/categories.service.ts
import client from "@/services/api/client";
import type { CreateCategoryDto, UpdateCategoryDto } from "@/types/categories";

export const CategoryService = {
    async listTree() {
        const { data } = await client.get("/categories/tree");
        return data;
    },
    async create(payload: CreateCategoryDto) {
        const { data } = await client.post("/categories", payload);
        return data;
    },
    async update(id: number, patch: UpdateCategoryDto) {
        const { data } = await client.patch(`/categories/${id}`, patch);
        return data;
    },
    async move(id: number, parentId: number | null) {
        const { data } = await client.post(`/categories/${id}/move`, { parentId });
        return data;
    },
    async reorderSiblings(parentId: number | null, orderedIds: number[]) {
        await client.post(`/categories/reorder`, { parentId, orderedIds });
    },
    async archive(id: number) {
        await client.post(`/categories/${id}/archive`);
    },
    async hardDelete(id: number) {
        await client.delete(`/categories/${id}`);
    },
};
