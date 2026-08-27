import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import type { User } from "../types/user";

import { listUsers } from "../api/users";

import { useCurrentUser } from "./CurrentUserContext";

type UserDirectoryContextType = {
    users: User[];

    isLoading: boolean;

    getUserById: (userId: string) => User | undefined;

    getUserByUsername: (username: string) => User | undefined;
};

const UserDirectoryContext =
    createContext<UserDirectoryContextType | undefined>(undefined);

export function UserDirectoryProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [fetchedUsers, setFetchedUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { currentUser } = useCurrentUser();

    useEffect(() => {
        listUsers()
            .then(setFetchedUsers)
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить список пользователей:",
                    error
                );
            })
            .finally(() => setIsLoading(false));
    }, []);

    // Профиль редактируется через setCurrentUser (оптимистично, ещё
    // до подтверждения с сервера) — подставляем актуальную версию
    // текущего пользователя поверх списка, иначе после правки
    // профиля его имя/аватар/био в чужих карточках короткое время
    // отставали бы от того, что человек только что сохранил у себя.
    const users = useMemo<User[]>(
        () =>
            fetchedUsers.map((user) =>
                user.id === currentUser.id ? currentUser : user
            ),
        [fetchedUsers, currentUser]
    );

    function getUserById(userId: string) {
        return users.find((user) => user.id === userId);
    }

    function getUserByUsername(username: string) {
        const normalized = username.toLowerCase();

        return users.find(
            (user) => user.nickname.toLowerCase() === normalized
        );
    }

    return (
        <UserDirectoryContext.Provider
            value={{
                users,
                isLoading,
                getUserById,
                getUserByUsername,
            }}
        >
            {children}
        </UserDirectoryContext.Provider>
    );
}

export function useUserDirectoryContext(): UserDirectoryContextType {
    const context = useContext(UserDirectoryContext);

    if (!context) {
        throw new Error(
            "useUserDirectoryContext must be used inside UserDirectoryProvider"
        );
    }

    return context;
}
