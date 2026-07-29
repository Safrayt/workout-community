import type {
    Achievement,
} from "../types/achievement";

export const achievements: Achievement[] = [

    {
        id: "first-event",

        title: "Го тренить, я создал",

        description:
            "Создать первое мероприятие.",

        icon: "📅",

        experience: 50,

        condition: "created-events",

        target: 1,
    },

    {
        id: "first-playground",

        title: "Смотри, что нашёл!",

        description:
            "Добавить первую найденную площадку.",

        icon: "🗺️",

        experience: 50,

        condition: "created-playgrounds",

        target: 1,
    },

    {
        id: "first-registration",

        title: "Первый раз в первый класс",

        description:
            "Записаться на первое мероприятие.",

        icon: "🤝",

        experience: 25,

        condition: "registrations",

        target: 1,
    },

    {
        id: "five-events",

        title: "Я был там Гендальф",

        description:
            "Посетить пять мероприятий.",

        icon: "🏆",

        experience: 100,

        condition: "attended-events",

        target: 5,
    },

];