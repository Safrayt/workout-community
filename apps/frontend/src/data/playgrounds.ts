import type { Playground } from "../types/playground";

export const playgrounds: Playground[] = [
    {
        id: "1",

        creatorId: "1",

        name: "Площадка в парке",

        locality: "Балашиха",

        address: "ш. Энтузиастов, 54А",

        coordinates: {
            latitude: 56.8092,
            longitude: 37.9638,
        },

        size: "large",

        amenities: {
            lighting: true,
            covered: false,
            changingRoom: false,
            toilet: false,
            drinkingWater: false,
            shower: false,
            parking: true,
            bicycleParking: true,
            trashBins: true,
            shade: true,
        },

        surface: "rubber",

        access: "free",

        condition: "acceptable",

        equipment: [
            "highPullBar",
            "mediumPullBar",
            "widePullBar",
            "highParallelBars",
            "wideMonkeyBars",
            "rings",
        ],

        photos: [],

        openingHours: "Круглосуточно",

        description:
            "Современная воркаут-площадка с резиновым покрытием.",

        createdAt: "2026-03-07T09:00:00.000Z",

        updatedAt: "2026-08-07T13:00:00.000Z",

        history: [
            {
                id: "h1",
                type: "created",
                date: "2026-03-07T09:00:00.000Z",
                userId: "1",
                username: "Safrayt",
            },
            {
                id: "h2",
                type: "inspection",
                date: "2026-05-17T12:00:00.000Z",
                userId: "2",
                username: "Lada",
            },
            {
                id: "h3",
                type: "edit",
                date: "2026-08-07T13:00:00.000Z",
                userId: "3",
                username: "Dima",
                changedFields: ["Удобства", "Состояние"],
            },
            {
                id: "h4",
                type: "inspection",
                date: "2026-08-07T13:05:00.000Z",
                userId: "3",
                username: "Dima",
            },
        ],
    },
        {
        id: "2",

        creatorId: "1",

        name: "Площадка у Глобуса",

        locality: "Балашиха",

        address: "ш. Энтузиастов, 54А",

        coordinates: {
            latitude: 55.8092,
            longitude: 37.9638,
        },

        size: "large",

        amenities: {
            lighting: true,
            covered: false,
            changingRoom: false,
            toilet: false,
            drinkingWater: false,
            shower: false,
            parking: true,
            bicycleParking: true,
            trashBins: true,
            shade: false,
        },

        surface: "rubber",

        access: "limited",

        condition: "needsRepair",

        accessRestrictions:
            "Территория закрытого ЖК — вход по пропускам жильцов, гостям нужна предварительная заявка на ресепшене.",

        equipment: [
            "highPullBar",
            "mediumPullBar",
            "widePullBar",
            "highParallelBars",
            "wideMonkeyBars",
            "rings",
        ],

        photos: [],

        openingHours: "Круглосуточно",

        description:
            "Современная воркаут-площадка с резиновым покрытием.",

        createdAt: "2026-06-15T09:00:00.000Z",

        updatedAt: "2026-06-15T09:00:00.000Z",

        history: [
            {
                id: "h5",
                type: "created",
                date: "2026-06-15T09:00:00.000Z",
                userId: "1",
                username: "Safrayt",
            },
        ],
    },
];