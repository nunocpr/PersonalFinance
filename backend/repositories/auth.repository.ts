import prisma from "../config/prisma";
import type { User } from "../generated/prisma";

// Finders
export async function findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
}

export async function findUserByPublicId(publicId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { publicId } });
}

// Create
export async function createUser(email: string, hash: string, name: string): Promise<User> {
    return prisma.user.create({
        data: {
            email,
            passwordHash: hash,
            name,
            isActive: true,
            emailVerified: false,
        },
    });
}

// Email verification helpers
export async function setEmailVerification(
    userId: number,
    tokenHash: string,
    expiresAt: Date
): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: {
            emailToken: tokenHash,
            emailTokenExpires: expiresAt,
            updatedAt: new Date(),
        },
    });
}

// Password reset helpers
export async function setPasswordResetToken(
    userId: number,
    tokenHash: string,
    expiresAt: Date
): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: {
            resetToken: tokenHash,
            resetTokenExpires: expiresAt,
            updatedAt: new Date(),
        },
    });
}

export async function getUserByPublicId(publicId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { publicId } });
}

export async function resetPasswordUsingToken(
    publicId: string,
    tokenHash: string,
    newPasswordHash: string
): Promise<User | null> {
    const candidate = await prisma.user.findFirst({
        where: {
            publicId,
            resetToken: tokenHash,
            resetTokenExpires: { gt: new Date() },
        },
    });
    if (!candidate) return null;

    return prisma.user.update({
        where: { id: candidate.id },
        data: {
            passwordHash: newPasswordHash,
            resetToken: null,
            resetTokenExpires: null,
            updatedAt: new Date(),
        },
    });
}

// Increment token version (logout everywhere)
export async function bumpTokenVersion(publicId: string): Promise<void> {
    await prisma.user.update({
        where: { publicId },
        data: { tokenVersion: { increment: 1 }, updatedAt: new Date() },
    });
}
