import prisma from "../config/prisma";
import type { Prisma, Category } from "../generated/prisma";

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
                where: { archived: false },
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
    const { count } = await prisma.category.updateMany({
        where: { id, user: { publicId: userPublicId } },
        data: patch,
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
        // ownership
        const cat = await tx.category.findFirst({
            where: { id, user: { publicId: userPublicId } },
        });
        if (!cat) throw new Error("Category not found.");

        const max = await tx.category.aggregate({
            _max: { sortOrder: true },
            where: { parentId: newParentId, user: { publicId: userPublicId } },
        });
        const newSort = (max._max.sortOrder ?? -1) + 1;

        return tx.category.update({
            where: { id },
            data: { parentId: newParentId, sortOrder: newSort },
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
    await prisma.$transaction(
        orderedIds.map((id, idx) =>
            prisma.category.updateMany({
                where: { id, parentId, user: { publicId: userPublicId } },
                data: { sortOrder: idx },
            })
        )
    );
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
