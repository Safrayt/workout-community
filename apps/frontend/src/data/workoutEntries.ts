import type { WorkoutEntry } from "../types/workoutEntry";

// Записи ниже используют относительные смещения от текущего момента
// (а не фиксированные даты), чтобы карта "Активность на площадках"
// и лента Главной всегда показывали содержательные примеры —
// независимо от того, когда именно открыт проект.
const now = Date.now();

function hoursAgo(hours: number) {
    return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

function dateDaysAgo(days: number) {
    const date = new Date(now - days * 24 * 60 * 60 * 1000);

    return date.toISOString().slice(0, 10);
}

const today = dateDaysAgo(0);

export const workoutEntries: WorkoutEntry[] = [
    {
        id: "1",
        userId: "1",
        playgroundId: "1",
        date: "2026-07-20",
        timeOfDay: "morning",
        tags: ["турник", "утро"],
        title: "Утренняя тренировка",
        description:
            "Подтягивания, отжимания, лёгкая растяжка.",
        createdAt: "2026-07-20T09:30:00",
    },
    {
        id: "2",
        userId: "3",
        playgroundId: "1",
        date: today,
        timeOfDay: "evening",
        tags: ["турник"],
        title: "Вечерняя тренировка на турниках",
        description:
            "Три подхода на турнике, потом лёгкая растяжка на все группы мышц.",
        createdAt: hoursAgo(0.3),
    },
    {
        id: "3",
        userId: "5",
        playgroundId: "2",
        date: today,
        timeOfDay: "day",
        tags: ["брусья"],
        title: "Силовая на брусьях",
        description:
            "Сделал силовой комплекс на брусьях — работал до отказа в каждом подходе.",
        createdAt: hoursAgo(2),
    },
    {
        // Дата события заметно отличается от даты публикации —
        // демонстрирует правило UX-HOME §21 в карточке ленты.
        id: "4",
        userId: "1",
        playgroundId: "1",
        date: dateDaysAgo(6),
        timeOfDay: "morning",
        title: "Забытая тренировка",
        description:
            "Забыл записать сразу после тренировки — восстановил по памяти только сейчас.",
        createdAt: hoursAgo(3),
    },
    {
        // Первая из четырёх записей одного дня — демонстрирует
        // дневной лимит Home Feed (UX-HOME §15): в ленте останутся
        // только 3 самые свежие, а на карте активности — все 4.
        id: "5",
        userId: "2",
        playgroundId: "2",
        date: today,
        timeOfDay: "day",
        tags: ["кардио"],
        title: "Кардио и работа с резинками",
        description: "Интервальная кардио-сессия и работа с эспандерами.",
        createdAt: hoursAgo(1),
    },
    {
        id: "6",
        userId: "2",
        playgroundId: "2",
        date: today,
        timeOfDay: "day",
        title: "Растяжка после пробежки",
        description: "Лёгкая пробежка вокруг парка и растяжка.",
        createdAt: hoursAgo(4),
    },
    {
        id: "7",
        userId: "2",
        playgroundId: "1",
        date: today,
        timeOfDay: "morning",
        title: "Работа над выходом силой",
        description: "Отрабатывал выход силой на турнике — пока получается через раз.",
        createdAt: hoursAgo(7),
    },
    {
        // Четвёртая запись Lada за день — не попадёт в Home Feed
        // из-за дневного лимита, но останется в её личном дневнике.
        id: "8",
        userId: "2",
        playgroundId: "1",
        date: today,
        timeOfDay: "morning",
        title: "Разминка перед основной тренировкой",
        description: "Суставная гимнастика и лёгкая кардио-разминка.",
        createdAt: hoursAgo(9),
    },
];