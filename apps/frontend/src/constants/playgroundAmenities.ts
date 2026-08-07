import type {
    PlaygroundAmenities,
} from "../types/playground";

export const playgroundAmenityLabels: Record<keyof PlaygroundAmenities, string> = {

    lighting: "Освещение",

    covered: "Навес",

    changingRoom: "Раздевалка",

    toilet: "Туалет",

    drinkingWater: "Питьевая вода",

    shower: "Душ",

    parking: "Парковка",

    bicycleParking: "Велопарковка",

    trashBins: "Урны",

    shade: "Тень",

};

export const playgroundAmenityIcons: Record<keyof PlaygroundAmenities, string> = {

    lighting: "💡",

    covered: "☂️",

    changingRoom: "🚪",

    toilet: "🚻",

    drinkingWater: "🚰",

    shower: "🚿",

    parking: "🅿️",

    bicycleParking: "🚲",

    trashBins: "🗑️",

    shade: "🌳",

};
