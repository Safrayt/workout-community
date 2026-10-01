import type { User } from "../types/user";

export type UserSortKey =
    | "registered-asc"
    | "registered-desc"
    | "name-asc"
    | "name-desc";

export type UserListFilter = "all" | "following";

export const userSortOptions: { value: UserSortKey; label: string }[] = [
    { value: "registered-asc", label: "Регистрация: сначала старые" },
    { value: "registered-desc", label: "Регистрация: сначала новые" },
    { value: "name-asc", label: "По алфавиту (А → Я)" },
    { value: "name-desc", label: "По алфавиту (Я → А)" },
];

function compareNames(a: User, b: User): number {
    // "ru" + base: регистр не важен, числа сравниваются как числа
    // (user2 раньше user10), кириллица и латиница сортируются
    // по правилам языка, а не по кодам символов.
    return a.nickname.localeCompare(b.nickname, "ru", {
        sensitivity: "base",
        numeric: true,
    });
}

function compareRegistration(a: User, b: User): number {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);

    const diff =
        (Number.isNaN(aTime) ? 0 : aTime) -
        (Number.isNaN(bTime) ? 0 : bTime);

    // Одинаковое время (или нераспознанная дата) — порядок по id,
    // чтобы список не "прыгал" между перерисовками.
    return diff !== 0
        ? diff
        : a.id.localeCompare(b.id, undefined, { numeric: true });
}

/** Возвращает новый отсортированный массив, исходный не меняется. */
export function sortUsers(users: User[], sortKey: UserSortKey): User[] {
    const sorted = [...users];

    switch (sortKey) {
        case "name-asc":
            return sorted.sort(compareNames);
        case "name-desc":
            return sorted.sort((a, b) => compareNames(b, a));
        case "registered-desc":
            return sorted.sort((a, b) => compareRegistration(b, a));
        case "registered-asc":
        default:
            return sorted.sort(compareRegistration);
    }
}
