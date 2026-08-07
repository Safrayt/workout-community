import type {
    PlaygroundAccess,
    PlaygroundCondition,
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

export const playgroundAccessLabels: Record<
    PlaygroundAccess,
    string
> = {

    free: "Свободный",

    limited: "Ограниченный",

};

export const playgroundConditionLabels: Record<
    PlaygroundCondition,
    string
> = {

    acceptable: "Приемлемо",

    needsRepair: "Требует ремонта",

    unusable: "Невозможно использовать",

};

/**
 * Цвет нарастает по серьёзности: зелёный → оранжевый → красный.
 * Оранжевый и красный совпадают с --color-warning/--color-danger.
 */
export const playgroundConditionColors: Record<
    PlaygroundCondition,
    string
> = {

    acceptable: "#38a169",

    needsRepair: "#dd6b20",

    unusable: "#e53e3e",

};