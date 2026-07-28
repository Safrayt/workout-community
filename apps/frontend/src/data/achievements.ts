import type {
    Achievement,
} from "../types/achievement";

export const achievements: Achievement[] = [

    {
        id: "first-event",

        title: "Организатор",

        description:
            "Создать первое мероприятие.",

        icon: "📅",

        experience: 50,
    },

    {
        id: "first-playground",

        title: "Исследователь",

        description:
            "Добавить первую площадку.",

        icon: "🗺️",

        experience: 50,
    },

    {
        id: "first-registration",

        title: "Участник",

        description:
            "Записаться на первое мероприятие.",

        icon: "🤝",

        experience: 25,
    },

    {
        id: "five-events",

        title: "Активист",

        description:
            "Посетить пять мероприятий.",

        icon: "🏆",

        experience: 100,
    },

];