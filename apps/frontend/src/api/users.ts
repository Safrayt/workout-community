import { apiFetch, buildQuery } from "./client";
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

/**
 * Оба эндпоинта ниже — только для администратора (см. ensure_admin
 * на бэкенде), используются исключительно разделом "Пользователи"
 * в админ-панели (pages/AdminUsers).
 */
export async function setUserFeedRestriction(
    userId: string,
    isFeedRestricted: boolean
): Promise<User> {
    const apiUser = await apiFetch<ApiUser>(
        `/users/${userId}/feed-restriction`,
        {
            method: "PUT",
            body: { is_feed_restricted: isFeedRestricted },
        }
    );

    return mapApiUserToUser(apiUser);
}

export async function deleteUser(
    userId: string,
    options: { withOwnedContent?: boolean } = {}
): Promise<void> {
    await apiFetch(
        `/users/${userId}${buildQuery({ with_owned_content: options.withOwnedContent })}`,
        { method: "DELETE" }
    );
}

/**
 * Удаление СОБСТВЕННОГО аккаунта (раздел "Опасная зона" в настройках
 * профиля) — в отличие от deleteUser выше, доступно любому
 * пользователю, но только по текущему паролю.
 *
 * Если у пользователя есть свои площадки/мероприятия/программы
 * (общий контент сообщества), сервер без withOwnedContent ответит
 * 409 с перечнем в message и ничего не удалит — вызывающий код
 * должен показать этот список и повторить запрос уже с согласием.
 */
export async function deleteOwnAccount(
    password: string,
    withOwnedContent = false
): Promise<void> {
    await apiFetch("/users/me/delete", {
        method: "POST",
        body: { password, with_owned_content: withOwnedContent },
    });
}
