import { apiFetch } from "./client";
import { mapApiUserToUser } from "./mappers/user";
import type { ApiUser } from "./mappers/user";

import type { User } from "../types/user";

/**
 * Список всех пользователей — источник для "справочника"
 * (hooks/useUserDirectory.ts), которым резолвятся чужие профили:
 * создатель мероприятия, автор отзыва/комментария и т.д.
 */
export async function listUsers(): Promise<User[]> {
    const apiUsers = await apiFetch<ApiUser[]>("/users/");

    return apiUsers.map(mapApiUserToUser);
}
