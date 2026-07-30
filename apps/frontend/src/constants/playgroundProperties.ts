import type {
    PlaygroundSize,
    PlaygroundSurface,
} from "../types/playground";

export const playgroundSizes: Record<
    PlaygroundSize,
    string
> = {

    small: "Маленькая",

    medium: "Средняя",

    large: "Большая",

};

export const playgroundSurfaces: Record<
    PlaygroundSurface,
    string
> = {

    rubber: "Резина",

    asphalt: "Асфальт",

    concrete: "Бетон",

    gravel: "Гравий",

    mulch: "Щепа",

    sand: "Песок",

    ground: "Земля",

    mixed: "Смешанное",

};