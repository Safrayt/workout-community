import type { Playground } from "../types/playground";

export const playgrounds: Playground[] = [
    {
        id: "globus",

        name: "Площадка у Глобуса",

        locality: "Балашиха",

        address: "Шоссе Энтузиастов",

        latitude: 55.796,

        longitude: 37.938,

        description:
            "Уличная воркаут-площадка возле гипермаркета.",

        lighting: true,

        covered: false,
    },

    {
        id: "victory-park",

        name: "Площадка в Парке Победы",

        locality: "Москва",

        address: "Парк Победы",

        latitude: 55.731,

        longitude: 37.503,

        description:
            "Большая современная площадка.",

        lighting: true,

        covered: false,
    },
];