import { users } from "../data/users";

export function getUserName(
    userId: string
) {
    const user = users.find(
        (user) => user.id === userId
    );

    return user ? user.name : "Неизвестный пользователь";
}