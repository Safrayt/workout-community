import { currentUser } from "../data/currentUser";

export function getUserName(
    userId: string
) {
    if (userId === currentUser.id) {
        return currentUser.name;
    }

    return "Неизвестный пользователь";
}