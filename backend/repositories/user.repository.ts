import prisma from "../config/prisma";
import type { User } from "@prisma/client";

export async function findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
}

export async function updateName(id: number, name: string): Promise<User> {
    return prisma.user.update({
        where: { id },
        data: { name, updatedAt: new Date() },
    });
}

export async function updatePasswordHash(id: number, hash: string): Promise<void> {
    await prisma.user.update({
        where: { id },
        data: { passwordHash: hash, updatedAt: new Date() },
    });
}
