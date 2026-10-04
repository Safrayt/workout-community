import type { Exercise, MovementType, MuscleGroupKey } from "../types/exercise";

import { movementTypeKeys } from "../constants/movementTypes";
import { muscleGroupKeys } from "../constants/muscleGroups";

export type ExerciseFilterState = {
    /** Выбранные типы движения. Пусто — любые. */
    movementTypes: MovementType[];

    /** Выбранные мышечные группы. Пусто — любые. */
    muscles: MuscleGroupKey[];
};

export const emptyExerciseFilters: ExerciseFilterState = {
    movementTypes: [],
    muscles: [],
};

export function countActiveExerciseFilters(filters: ExerciseFilterState) {
    return filters.movementTypes.length + filters.muscles.length;
}

export function hasActiveExerciseFilters(filters: ExerciseFilterState) {
    return countActiveExerciseFilters(filters) > 0;
}

export function toggleItem<T>(list: T[], item: T): T[] {
    return list.includes(item)
        ? list.filter((current) => current !== item)
        : [...list, item];
}

/** Все мышцы упражнения — и целевые, и вспомогательные. */
export function getExerciseMuscles(exercise: Exercise): MuscleGroupKey[] {
    return [...exercise.targetMuscles, ...exercise.auxiliaryMuscles];
}

/**
 * Отбор упражнений:
 * - по типу движения — "ИЛИ": у упражнения один тип, поэтому несколько
 *   выбранных типов значат "любой из них";
 * - по мышцам — "И": остаются упражнения, которые нагружают ВСЕ выбранные
 *   мышечные группы (целевые или вспомогательные).
 *
 * Если выбраны мышцы, упражнения упорядочиваются по релевантности: сначала те,
 * где больше выбранных мышц — целевые, а не вспомогательные. Среди равных
 * сохраняется исходный порядок.
 */
export function filterExercises(
    exercises: Exercise[],
    filters: ExerciseFilterState
): Exercise[] {
    const matching = exercises.filter((exercise) => {
        if (
            filters.movementTypes.length > 0 &&
            !filters.movementTypes.includes(exercise.movementType)
        ) {
            return false;
        }

        const exerciseMuscles = getExerciseMuscles(exercise);

        return filters.muscles.every((muscle) =>
            exerciseMuscles.includes(muscle)
        );
    });

    if (filters.muscles.length === 0) {
        return matching;
    }

    const targetCount = (exercise: Exercise) =>
        filters.muscles.filter((muscle) =>
            exercise.targetMuscles.includes(muscle)
        ).length;

    // Array.prototype.sort стабилен, поэтому равные по релевантности
    // остаются в исходном порядке.
    return [...matching].sort((a, b) => targetCount(b) - targetCount(a));
}

// ---------------------------------------------------------------------
// Фильтры в адресной строке: ?movement=pull,push&muscles=lats,biceps
//
// Так выбранные фильтры переживают переход на страницу упражнения и
// возврат назад, а подборку можно отправить ссылкой.
// ---------------------------------------------------------------------

const MOVEMENT_PARAM = "movement";
const MUSCLES_PARAM = "muscles";

function parseList<T extends string>(
    value: string | null,
    allowed: readonly T[]
): T[] {
    if (!value) {
        return [];
    }

    // Неизвестные значения (опечатка в ссылке, ключ, которого уже нет)
    // и повторы молча отбрасываем.
    const parsed = value
        .split(",")
        .filter((item): item is T => (allowed as readonly string[]).includes(item));

    return [...new Set(parsed)];
}

export function parseExerciseFilters(
    params: URLSearchParams
): ExerciseFilterState {
    return {
        movementTypes: parseList(params.get(MOVEMENT_PARAM), movementTypeKeys),
        muscles: parseList(params.get(MUSCLES_PARAM), muscleGroupKeys),
    };
}

/**
 * Возвращает копию params с фильтрами из filters; остальные параметры
 * адреса не трогает.
 */
export function writeExerciseFilters(
    params: URLSearchParams,
    filters: ExerciseFilterState
): URLSearchParams {
    const next = new URLSearchParams(params);

    if (filters.movementTypes.length > 0) {
        next.set(MOVEMENT_PARAM, filters.movementTypes.join(","));
    } else {
        next.delete(MOVEMENT_PARAM);
    }

    if (filters.muscles.length > 0) {
        next.set(MUSCLES_PARAM, filters.muscles.join(","));
    } else {
        next.delete(MUSCLES_PARAM);
    }

    return next;
}
