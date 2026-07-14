export function getUserLevel(experience: number): string {
    if (experience < 200) {
        return "Новичок";
    }

    if (experience < 700) {
        return "Опытный";
    }

    if (experience < 1500) {
        return "Продвинутый";
    }

    return "Эксперт";
}