import type { Playground } from "../types/playground";

import {
    accessPoints,
    conditionPoints,
    ratingMaxPoints,
    sizePoints,
    surfacePoints,
    unusableRatingCap,
} from "../constants/playgroundRating";

import {
    playgroundAmenityLabels,
} from "../constants/playgroundAmenities";

import {
    playgroundEquipment,
} from "../constants/playgroundEquipment";

const TOTAL_AMENITIES = Object.keys(playgroundAmenityLabels).length;

const TOTAL_EQUIPMENT_CATEGORIES = new Set(
    Object.values(playgroundEquipment).map((item) => item.category)
).size;

/**
 * Количество элементов оборудования, после которого фактор
 * "количество" считается набравшим максимум очков (дальше
 * играет роль только разнообразие категорий).
 */
const EQUIPMENT_COUNT_CAP = 10;

function getEquipmentScore(
    playground: Playground
): number {

    const countScore =
        Math.min(
            1,
            playground.equipment.length / EQUIPMENT_COUNT_CAP
        );

    const categoriesCovered = new Set(
        playground.equipment.map(
            (item) => playgroundEquipment[item].category
        )
    ).size;

    const diversityScore =
        categoriesCovered / TOTAL_EQUIPMENT_CATEGORIES;

    return (
        (0.7 * countScore + 0.3 * diversityScore) *
        ratingMaxPoints.equipment
    );

}

function getAmenitiesScore(
    playground: Playground
): number {

    const activeAmenities = Object.values(
        playground.amenities
    ).filter(Boolean).length;

    return (
        (activeAmenities / TOTAL_AMENITIES) *
        ratingMaxPoints.amenities
    );

}

/**
 * "Время работы" — свободный текст, а не перечисление, поэтому
 * очки по нему — эвристика: круглосуточно даёт максимум,
 * распознанный диапазон часов — долю от суток, а нераспознанный
 * текст — нейтральные 60%, чтобы не наказывать площадку только
 * за нестандартную формулировку.
 */
function getOpeningHoursScore(
    openingHours: string
): number {

    const normalized = openingHours.trim().toLowerCase();

    if (
        normalized.length === 0
    ) {
        return ratingMaxPoints.openingHours * 0.6;
    }

    if (
        /круглосуточ|24\s*\/\s*7|24\s*час/.test(normalized)
    ) {
        return ratingMaxPoints.openingHours;
    }

    const rangeMatch = normalized.match(
        /(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})/
    );

    if (
        rangeMatch
    ) {

        const startHour = Number(rangeMatch[1]) + Number(rangeMatch[2]) / 60;
        const endHour = Number(rangeMatch[3]) + Number(rangeMatch[4]) / 60;

        const duration =
            endHour > startHour
                ? endHour - startHour
                : (24 - startHour) + endHour;

        const dayShare = Math.min(1, Math.max(0.2, duration / 24));

        return dayShare * ratingMaxPoints.openingHours;

    }

    return ratingMaxPoints.openingHours * 0.6;

}

/**
 * Абсолютный рейтинг площадки в очках (0–100). Складывается из
 * взвешенных факторов: состояние, оборудование, удобства, покрытие,
 * размер, доступ и время работы. См. константы в
 * `constants/playgroundRating.ts` для весов и обоснования.
 */
export function calculatePlaygroundRating(
    playground: Playground
): number {

    const rawScore =
        conditionPoints[playground.condition] +
        getEquipmentScore(playground) +
        getAmenitiesScore(playground) +
        surfacePoints[playground.surface] +
        sizePoints[playground.size] +
        accessPoints[playground.access] +
        getOpeningHoursScore(playground.openingHours);

    const cappedScore =
        playground.condition === "unusable"
            ? Math.min(rawScore, unusableRatingCap)
            : rawScore;

    return Math.round(cappedScore);

}
