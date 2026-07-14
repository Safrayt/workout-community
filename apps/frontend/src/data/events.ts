import type { Event } from "../types/event";

export const events: Event[] = [
    {
        id: "1",
        title: "Общая тренировка BarBosS",
        description:
            "Лёгкая групповая тренировка для всех уровней подготовки.",

        city: "Балашиха",

        location: "Площадка у Глобуса",

        date: "Суббота, 10:00",

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

        date: "Воскресенье, 11:00",

        expectedParticipants: 8,

        weather: "—",
    },
];