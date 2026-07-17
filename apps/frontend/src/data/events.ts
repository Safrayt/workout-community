import type { Event } from "../types/event";

export const events: Event[] = [
    {
        id: "1",
        title: "Общая тренировка BarBosS",
        description:
            "Лёгкая групповая тренировка для всех уровней подготовки.",

        city: "Балашиха",

        location: "Площадка у Глобуса",

        startDate:
            "2026-07-18T10:00:00",

        expectedParticipants: 13,

        weather: "—",
    },

    {
        id: "2",
        title: "Общая тренировка в Парке Победы",
        description:
            "Еженедельная общая тренировка сообщества.",

        city: "Москва",

        location: "Площадка в Парке Победы",

        startDate:
            "2026-09-19T11:00:00",

        expectedParticipants: 8,

        weather: "—",
    },
];