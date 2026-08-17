import { users } from "../data/users";

/**
 * Статичный (без учёта live-правок currentUser) поиск по username.
 * Для публичного профиля /u/:username предпочтительнее хук
 * useUserDirectory — он подставляет актуальные данные текущего
 * пользователя. Эта функция пригождается там, где хук недоступен
 * (вне компонента) или свежесть данных не важна.
 */
export function getUserByUsername(
    username: string
) {
    const normalized = username.toLowerCase();

    return users.find(
        (user) =>
            user.nickname.toLowerCase() === normalized
    );
}
