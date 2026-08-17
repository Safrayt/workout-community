import { useMemo } from "react";

import { users as staticUsers } from "../data/users";

import { useCurrentUser } from "../context/CurrentUserContext";

import type { User } from "../types/user";

/**
 * Профиль редактируется только в памяти (setCurrentUser), а
 * data/users.ts остаётся прежним — поэтому любое место, которое
 * ищет пользователя по id/username в статичном списке, показывало
 * бы устаревшие аватар/about текущего пользователя. Этот хук
 * подставляет актуальную версию currentUser в общий список, чтобы
 * такого расхождения не было нигде, где ищут "чужого" пользователя
 * (создателя события, автора отзыва и т.д.).
 */
export function useUserDirectory() {
    const { currentUser } = useCurrentUser();

    const allUsers = useMemo<User[]>(
        () =>
            staticUsers.map((user) =>
                user.id === currentUser.id
                    ? currentUser
                    : user
            ),
        [currentUser]
    );

    function getUserById(userId: string) {
        return allUsers.find(
            (user) => user.id === userId
        );
    }

    function getUserByUsername(username: string) {
        const normalized = username.toLowerCase();

        return allUsers.find(
            (user) =>
                user.nickname.toLowerCase() === normalized
        );
    }

    return {
        users: allUsers,
        getUserById,
        getUserByUsername,
    };
}
