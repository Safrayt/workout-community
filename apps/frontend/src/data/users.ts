import type { User } from "../types/user";

export const users: User[] = [
    {
        id: "1",

        name: "Василий",

        nickname: "Safrayt",

        locality: "Балашиха",

        bio:
            "Люблю воркаут, турники и тренировки на свежем воздухе.",

        avatarUrl: "",

        experience: 540,

        createdAt: "2026-05-12",

        socialLinks: {
            telegram: "@Safrayt",
            github: "Safrayt",
        },
    },
    {
        id: "2",

        name: "Лада",

        nickname: "Lada",

        locality: "Балашиха",

        bio:
            "Тренируюсь по вечерам, люблю турники и растяжку.",

        avatarUrl: "",

        experience: 210,

        createdAt: "2026-04-01",

        socialLinks: {},
    },
    {
        id: "3",

        name: "Дима",

        nickname: "Dima",

        locality: "Балашиха",

        bio:
            "Воркаут с 2022 года, стараюсь поддерживать площадки в порядке.",

        avatarUrl: "",

        experience: 890,

        createdAt: "2026-02-20",

        socialLinks: {},
    },
];