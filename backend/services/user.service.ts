import * as userRepo from "../repositories/user.repository";
import { comparePassword, hashPassword } from "../utils/password";

export async function changeDisplayName(userId: number, name: string) {
    if (!name || name.trim().length < 2) throw new Error("Invalid name");
    const updated = await userRepo.updateName(userId, name.trim());
    const { passwordHash, ...safe } = updated;
    return { user: safe };
}

export async function changePassword(userId: number, current: string, nextPwd: string) {
    if (!current || !nextPwd) throw new Error("Invalid request");
    if (nextPwd.length < 8) throw new Error("Password too short");

    const user = await userRepo.findById(userId);
    if (!user) throw new Error("Unauthorized");

    const ok = await comparePassword(current, user.passwordHash);
    if (!ok) {
        const e = new Error("INVALID_CURRENT_PASSWORD");
        (e as any).code = "INVALID_CURRENT_PASSWORD";
        throw e;
    }

    const newHash = await hashPassword(nextPwd);
    await userRepo.updatePasswordHash(userId, newHash);
    return { message: "Password updated" };
}
