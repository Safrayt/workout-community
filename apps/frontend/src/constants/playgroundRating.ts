import type {
    PlaygroundAccess,
    PlaygroundCondition,
    PlaygroundSize,
    PlaygroundSurface,
} from "../types/playground";

/**
 * Максимум очков по каждому фактору. Сумма максимумов — это
 * максимально возможный рейтинг площадки (100 очков).
 */
export const ratingMaxPoints = {

    condition: 30,

    equipment: 25,

    amenities: 15,

    surface: 10,

    size: 8,

    access: 7,

    openingHours: 5,

} as const;

export const conditionPoints: Record<
    PlaygroundCondition,
    number
> = {

    acceptable: 30,

    needsRepair: 12,

    unusable: 0,

};

/**
 * Покрытие ранжировано по мягкости/безопасности при падении:
 * резина — самое безопасное, земля/гравий — самое жёсткое и неровное.
 */
export const surfacePoints: Record<
    PlaygroundSurface,
    number
> = {

    rubber: 10,

    mulch: 8,

    mixed: 7,

    sand: 7,

    concrete: 5,

    asphalt: 5,

    ground: 4,

    gravel: 3,

};

export const sizePoints: Record<
    PlaygroundSize,
    number
> = {

    small: 4,

    medium: 6,

    large: 8,

};

export const accessPoints: Record<
    PlaygroundAccess,
    number
> = {

    free: 7,

    limited: 3.5,

};

/**
 * Если площадка "Невозможно использовать" — рейтинг жёстко
 * ограничивается сверху, сколько бы очков ни набралось по
 * остальным факторам: тренироваться там всё равно нельзя.
 */
export const unusableRatingCap = 15;

/**
 * Пороги для цветовой дифференциации рейтинга — та же 4-ступенчатая
 * логика серьёзности, что и у бейджа "Состояние": зелёный → жёлтый →
 * оранжевый → красный.
 */
export const ratingThresholds = [

    { min: 80, color: "#38a169", label: "Отличная" },

    { min: 60, color: "#d69e2e", label: "Хорошая" },

    { min: 40, color: "#dd6b20", label: "Средняя" },

    { min: 0, color: "#e53e3e", label: "Низкая" },

] as const;

export function getRatingTier(
    rating: number
) {

    return (
        ratingThresholds.find(
            (tier) => rating >= tier.min
        ) ?? ratingThresholds[ratingThresholds.length - 1]
    );

}
