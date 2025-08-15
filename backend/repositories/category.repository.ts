// src/repositories/category.repository.ts
import { PrismaClient, Prisma } from "../generated/prisma";
const prisma = new PrismaClient();

type CreateCategoryInput = {
    name: string;
    description?: string | null;
    parentId?: number | null;
    sortOrder?: number;
    icon?: string | null;
    color?: string | null;
    type?: "expense" | "income" | "transfer";
};

// Read the tree (roots + children), scoped by user
export async function listTree(userPublicId: string) {
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

// Create category (checked input with nested connects)
export async function create(userPublicId: string, data: CreateCategoryInput) {
    // compute sort order within the destination level
    let sortOrder = data.sortOrder;
    if (sortOrder == null) {
        const max = await prisma.category.aggregate({
            _max: { sortOrder: true },
            where: {
                user: { publicId: userPublicId },
                parent: data.parentId != null ? { id: data.parentId } : { is: null },
            },
        });
        sortOrder = (max._max.sortOrder ?? -1) + 1;
    }

    const payload = {
        name: data.name,
        description: data.description ?? null,
        sortOrder,
        icon: data.icon ?? null,
        color: data.color ?? null,
        type: data.type ?? "expense",
        user: { connect: { publicId: userPublicId } }, // nested relation
        parent: data.parentId != null ? { connect: { id: data.parentId } } : undefined, // nested relation
    } satisfies Prisma.CategoryCreateInput;

    return prisma.category.create({ data: payload });
}

// Update scalar props (no relation changes here)
export async function update(
    userPublicId: string,
    id: number,
    patch: Prisma.CategoryUpdateManyMutationInput // scalar fields only
) {
    const { count } = await prisma.category.updateMany({
        where: { id, user: { publicId: userPublicId } },
        data: patch,
    });
    if (count === 0) throw new Error("Category not found.");
    return prisma.category.findFirstOrThrow({ where: { id, user: { publicId: userPublicId } } });
}

// Move to a new parent (or root). Use nested parent connect/disconnect.
export async function move(
    userPublicId: string,
    id: number,
    newParentId: number | null
) {
    return prisma.$transaction(async (tx) => {
        // ensure the category belongs to the user
        const cat = await tx.category.findFirst({
            where: { id, user: { publicId: userPublicId } },
            select: { id: true },
        });
        if (!cat) throw new Error("Category not found.");

        // if setting a new parent, ensure it also belongs to the user
        if (newParentId != null) {
            const parent = await tx.category.findFirst({
                where: { id: newParentId, user: { publicId: userPublicId } },
                select: { id: true },
            });
            if (!parent) throw new Error("Parent category not found.");
        }

        // compute sort order at destination level
        const max = await tx.category.aggregate({
            _max: { sortOrder: true },
            where: {
                user: { publicId: userPublicId },
                parent: newParentId != null ? { id: newParentId } : { is: null },
            },
        });
        const newOrder = (max._max.sortOrder ?? -1) + 1;

        // update using nested relation for parent
        return tx.category.update({
            where: { id },
            data: {
                sortOrder: newOrder,
                parent:
                    newParentId != null
                        ? { connect: { id: newParentId } }
                        : { disconnect: true },
            },
        });
    });
}

// Reorder siblings at one level (keep scalar where filter; it’s fine for mass updates)
export async function reorderSiblings(
    userPublicId: string,
    parentId: number | null,
    orderedIds: number[]
) {
    await prisma.$transaction(
        orderedIds.map((id, idx) =>
            prisma.category.updateMany({
                where: { id, parentId, user: { publicId: userPublicId } },
                data: { sortOrder: idx },
            })
        )
    );
}

// Archive (soft hide)
export async function archive(userPublicId: string, id: number) {
    const { count } = await prisma.category.updateMany({
        where: { id, user: { publicId: userPublicId } },
        data: { archived: true },
    });
    if (count === 0) throw new Error("Category not found.");
    return prisma.category.findFirstOrThrow({ where: { id, user: { publicId: userPublicId } } });
}

// Hard delete with safety checks
export async function hardDelete(userPublicId: string, id: number) {
    return prisma.$transaction(async (tx) => {
        const cat = await tx.category.findFirst({
            where: { id, user: { publicId: userPublicId } },
            select: { id: true },
        });
        if (!cat) throw new Error("Category not found.");

        const kids = await tx.category.count({
            where: { parentId: id, user: { publicId: userPublicId } },
        });
        if (kids > 0) throw new Error("Cannot delete a parent that has children. Archive instead.");

        const used = await tx.transaction.count({ where: { categoryId: id } });
        if (used > 0) throw new Error("Category is used by transactions.");

        await tx.category.delete({ where: { id } });
    });
}
