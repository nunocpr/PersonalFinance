import client from "@/services/api/client";
import type { UserDto } from "@/types/auth";

export async function updateUserName(user_name: string): Promise<{ user: UserDto }> {
    const { data } = await client.patch<{ user: UserDto }>("/users/me", { user_name });
    return data;
}

export async function updateUserPassword(payload: { current_password: string; new_password: string }): Promise<{ message: string }> {
    const { data } = await client.post<{ message: string }>("/users/change-password", payload);
    return data;
}
