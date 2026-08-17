import type { User } from "../types/user";
import { DEFAULT_PRIVACY_SETTINGS } from "../types/privacySettings";

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

        privacySettings: DEFAULT_PRIVACY_SETTINGS,
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

        privacySettings: DEFAULT_PRIVACY_SETTINGS,
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

        privacySettings: DEFAULT_PRIVACY_SETTINGS,
    },
    {
        id: "4",

        name: "Аня",

        nickname: "Anutka",

        locality: "Балашиха",

        bio:
            "Начинающая, но упорная. Учусь подтягиваться на одной руке.",

        avatarUrl: "",

        experience: 60,

        createdAt: "2026-07-01",

        socialLinks: {},

        privacySettings: DEFAULT_PRIVACY_SETTINGS,
    },
    {
        id: "5",

        name: "Максим",

        nickname: "MaxPower",

        locality: "Балашиха",

        bio:
            "Силовой воркаут, планка и брусья.",

        avatarUrl: "",

        experience: 1620,

        createdAt: "2025-11-03",

        socialLinks: {
            telegram: "@MaxPower",
        },

        privacySettings: DEFAULT_PRIVACY_SETTINGS,
    },
    {
        id: "6",

        name: "Оля",

        nickname: "OlyaFly",

        locality: "Балашиха",

        bio:
            "Растяжка, воркаут-акробатика.",

        avatarUrl: "",

        experience: 430,

        createdAt: "2026-03-18",

        socialLinks: {},

        privacySettings: DEFAULT_PRIVACY_SETTINGS,
    },
    {
        id: "7",

        name: "Игорь",

        nickname: "Grom",

        locality: "Балашиха",

        bio:
            "На турниках с детства.",

        avatarUrl: "",

        experience: 1180,

        createdAt: "2025-09-27",

        socialLinks: {},

        privacySettings: DEFAULT_PRIVACY_SETTINGS,
    },
    {
        id: "8",

        name: "Настя",

        nickname: "Nastya_W",

        locality: "Балашиха",

        bio:
            "Первый месяц в воркауте, но уже не пропускаю тренировки.",

        avatarUrl: "",

        experience: 15,

        createdAt: "2026-07-20",

        socialLinks: {},

        privacySettings: DEFAULT_PRIVACY_SETTINGS,
    },
    {
        id: "9",

        name: "Костя",

        nickname: "KotBayun",

        locality: "Балашиха",

        bio:
            "Люблю брусья и поболтать после тренировки.",

        avatarUrl: "",

        experience: 320,

        createdAt: "2026-01-14",

        socialLinks: {},

        privacySettings: DEFAULT_PRIVACY_SETTINGS,
    },
    {
        id: "10",

        name: "Женя",

        nickname: "Zhenya_K",

        locality: "Балашиха",

        bio:
            "Тренируюсь с друзьями по выходным.",

        avatarUrl: "",

        experience: 710,

        createdAt: "2025-12-05",

        socialLinks: {},

        privacySettings: DEFAULT_PRIVACY_SETTINGS,
    },
];