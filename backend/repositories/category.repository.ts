import prisma from "../config/prisma";
import type { Prisma, Category } from "@prisma/client";

// Input shape the controller/service will pass in
export type CreateCategoryInput = {
    name: string;
    description?: string | null;
    parentId?: number | null;
    sortOrder?: number; // optional: auto-calc if missing
    icon?: string | null;
    color?: string | null;
    type?: "expense" | "income" | "transfer";
};

/**
 * Árvore de categorias (apenas 2 níveis, já respeitado por trigger)
 * - Só não arquivadas
 * - Ordenadas por sortOrder
 * - Filhos dentro de cada root
 */
export async function listTree(userPublicId: string): Promise<Category[]> {
    return prisma.category.findMany({
        where: { archived: false, parentId: null, user: { publicId: userPublicId } },
        orderBy: { sortOrder: "asc" },
        include: {
            children: {
                where: { archived: false, user: { publicId: userPublicId } },
                orderBy: { sortOrder: "asc" },
            },
        },
    });
}

/**
 * Cria root OU subcategoria.
 * - Se sortOrder não for enviado, é calculado (max + 1) nos irmãos do destino.
 */
export async function create(
    userPublicId: string,
    data: CreateCategoryInput
): Promise<Category> {

    if (data.parentId != null) {
        const parent = await prisma.category.findFirst({
            where: { id: data.parentId, user: { publicId: userPublicId } },
            select: { id: true },
        });
        if (!parent) throw new Error("Parent not found."); // or 403
    }

    let sortOrder = data.sortOrder;

    if (sortOrder == null) {
        const max = await prisma.category.aggregate({
            _max: { sortOrder: true },
            where: {
                user: { publicId: userPublicId },
                parentId: data.parentId ?? null,
            },
        });
        sortOrder = (max._max.sortOrder ?? -1) + 1;
    }

    const payload: Prisma.CategoryCreateInput = {
        name: data.name,
        description: data.description ?? null,
        sortOrder,
        icon: data.icon ?? null,
        color: data.color ?? null,
        type: (data.type as any) ?? "expense",
        user: { connect: { publicId: userPublicId } },
        ...(data.parentId != null
            ? { parent: { connect: { id: data.parentId } } }
            : {}),
    };

    return prisma.category.create({ data: payload });
}

/**
 * Atualiza propriedades seguras (name, description, icon, color, type, archived).
 * - Escopado por userPublicId para não depender do userId interno.
 */
export async function update(
    userPublicId: string,
    id: number,
    patch: Partial<Pick<Category, "name" | "description" | "icon" | "color" | "type" | "archived">>
): Promise<Category> {
    // Belt & suspenders: never allow client to sneak structural fields
    const { name, description, icon, color, type, archived } = patch ?? {};

    const { count } = await prisma.category.updateMany({
        where: { id, user: { publicId: userPublicId } },
        data: { name, description, icon, color, type, archived },
    });
    if (count === 0) throw new Error("Category not found.");

    return prisma.category.findFirstOrThrow({
        where: { id, user: { publicId: userPublicId } },
    });
}

/**
 * Move para novo parentId (ou root=null) e atribui novo sortOrder no destino.
 * - Duas camadas já são validadas via trigger no DB.
 */
export async function move(
    userPublicId: string,
    id: number,
    newParentId: number | null
): Promise<Category> {
    return prisma.$transaction(async (tx) => {
        // 1) Source must belong to user
        const cat = await tx.category.findFirst({
            where: { id, user: { publicId: userPublicId } },
            select: { id: true },
        });
        if (!cat) throw new Error("Category not found.");

        // 2) If moving under a parent, that parent must also belong to user
        if (newParentId != null) {
            const parent = await tx.category.findFirst({
                where: { id: newParentId, user: { publicId: userPublicId } },
                select: { id: true },
            });
            if (!parent) throw new Error("Parent not found.");
        }

        // 3) Compute new sort in the *user-scoped* sibling set
        const max = await tx.category.aggregate({
            _max: { sortOrder: true },
            where: { parentId: newParentId, user: { publicId: userPublicId } },
        });
        const newSort = (max._max.sortOrder ?? -1) + 1;

        // 4) Move
        const { count } = await tx.category.updateMany({
            where: { id, user: { publicId: userPublicId } },
            data: { parentId: newParentId, sortOrder: newSort },
        });
        if (count === 0) throw new Error("Category not found.");

        return tx.category.findFirstOrThrow({
            where: { id, user: { publicId: userPublicId } },
        });
    });
}

/**
 * Reordenar irmãos no mesmo nível (root parentId=null ou children num parentId específico).
 */
export async function reorderSiblings(
    userPublicId: string,
    parentId: number | null,
    orderedIds: number[]
): Promise<void> {
    await prisma.$transaction(async (tx) => {
        // 1) Fetch the set we are allowed to reorder (user + parent)
        const siblings = await tx.category.findMany({
            where: { parentId, user: { publicId: userPublicId } },
            select: { id: true },
        });
        const allowed = new Set(siblings.map(s => s.id));

        // 2) Ensure every provided id is owned & in this parent
        if (!orderedIds.length) return; // nothing to do
        for (const id of orderedIds) {
            if (!allowed.has(id)) throw new Error("Invalid category in ordering.");
        }

        // (Optional but nice): ensure no missing ids (i.e., client sent all)
        // if (siblings.length !== orderedIds.length) throw new Error("Ordering must include all siblings.");

        // 3) Apply order
        for (let idx = 0; idx < orderedIds.length; idx++) {
            const id = orderedIds[idx];
            await tx.category.updateMany({
                where: { id, parentId, user: { publicId: userPublicId } },
                data: { sortOrder: idx },
            });
        }
    });
}

/**
 * Arquivar (soft hide). Mantemos o registo e a integridade.
 */
export async function archive(
    userPublicId: string,
    id: number
): Promise<Category> {
    const { count } = await prisma.category.updateMany({
        where: { id, user: { publicId: userPublicId } },
        data: { archived: true },
    });
    if (count === 0) throw new Error("Category not found.");

    return prisma.category.findFirstOrThrow({
        where: { id, user: { publicId: userPublicId } },
    });
}

/**
 * Apagar definitivo.
 * - Bloqueia se tiver filhos
 * - Bloqueia se estiver usada por transações
 */
export async function hardDelete(
    userPublicId: string,
    id: number
): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const owned = await tx.category.findFirst({
            where: { id, user: { publicId: userPublicId } },
            select: { id: true },
        });
        if (!owned) throw new Error("Category not found.");

        const kids = await tx.category.count({
            where: { parentId: id, user: { publicId: userPublicId } },
        });
        if (kids > 0) throw new Error("Cannot delete a parent that has children. Archive instead.");

        const used = await tx.transaction.count({ where: { categoryId: id } });
        if (used > 0) throw new Error("Category is used by transactions.");

        await tx.category.delete({ where: { id } });
    });
}
