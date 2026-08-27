import { useUserDirectoryContext } from "../context/UserDirectoryContext";

/**
 * Ищет пользователя по id/username среди всех пользователей портала.
 * Раньше источником был статичный data/users.ts (см. историю
 * изменений) — теперь это реальный список с бэкенда (GET /users/),
 * подгруженный через UserDirectoryProvider. Сигнатура и поведение
 * (включая подстановку актуального currentUser поверх списка)
 * сохранены без изменений — весь остальной код, использующий этот
 * хук, трогать не пришлось.
 */
export function useUserDirectory() {
    const { users, getUserById, getUserByUsername } =
        useUserDirectoryContext();

    return {
        users,
        getUserById,
        getUserByUsername,
    };
}
