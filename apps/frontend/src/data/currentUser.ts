import type { User } from "../types/user";

export const currentUser: User = {
    id: "1",

    name: "Василий",

    nickname: "Safrayt",

    locality: "Балашиха",

    bio: "Люблю тренировки на свежем воздухе",

    avatarUrl: "",

    experience: 0,

    createdAt: new Date().toISOString(),

    socialLinks: {
        telegram: "",
        instagram: "",
        vk: "",
    },
};