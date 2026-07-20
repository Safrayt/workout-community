import type { Playground } from "../types/playground";

export const playgrounds: Playground[] = [
    {
        id: "1",

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
        },

        surface: "rubber",

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
            "Современная воркаут-площадка с резиновым покрытием."
    },
        {
        id: "2",

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
        },

        surface: "rubber",

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
            "Современная воркаут-площадка с резиновым покрытием."
    },
];