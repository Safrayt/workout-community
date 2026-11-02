import type { Exercise, MovementType, MuscleGroupKey } from "../types/exercise";
import type { PlaygroundEquipment } from "../types/playground";

import { movementTypeKeys } from "../constants/movementTypes";
import { muscleGroupKeys } from "../constants/muscleGroups";
import { isExerciseAvailableAt } from "./exerciseEquipment";

export type ExerciseFilterState = {
    /** Выбранные типы движения. Пусто — любые. */
    movementTypes: MovementType[];

    /** Выбранные мышечные группы. Пусто — любые. */
    muscles: MuscleGroupKey[];

    /**
     * id площадки, по оборудованию которой отбираются упражнения (см.
     * isExerciseAvailableAt). Пустая строка — без отбора по площадке.
     */
    playgroundId: string;

    /**
     * Строка поиска по названию упражнения (как её ввёл человек, без
     * обрезки пробелов). Пусто — искать не нужно. Живёт рядом с
     * фильтрами, но фильтром в "счётчике фильтров" не считается:
     * поиск виден всегда, а скрывается только панель фильтров.
     */
    query: string;
};

export const emptyExerciseFilters: ExerciseFilterState = {
    movementTypes: [],
    muscles: [],
    playgroundId: "",
    query: "",
};

/**
 * Сколько выбрано фильтров: типы движения, мышцы и площадка (поиск по
 * названию не считается).
 */
export function countActiveExerciseFilters(filters: ExerciseFilterState) {
    return (
        filters.movementTypes.length +
        filters.muscles.length +
        (filters.playgroundId !== "" ? 1 : 0)
    );
}

export function hasActiveExerciseFilters(filters: ExerciseFilterState) {
    return countActiveExerciseFilters(filters) > 0;
}

export function toggleItem<T>(list: T[], item: T): T[] {
    return list.includes(item)
        ? list.filter((current) => current !== item)
        : [...list, item];
}

/**
 * Приводит строку к виду для сравнения: без различия регистра и без
 * различия "е"/"ё" (люди пишут "бёдра" и "бедра" как придётся).
 */
export function normalizeSearchText(text: string): string {
    return text.toLocaleLowerCase("ru").replaceAll("ё", "е");
}

/**
 * Подходит ли упражнение под строку поиска. Ищем в русском и в
 * английском названии. Запрос из нескольких слов — по "И": каждое
 * слово должно встретиться в названии (в любом порядке), поэтому
 * "подтяг шир" находит "Подтягивания широким хватом". Пустой запрос
 * (или из одних пробелов) подходит всем.
 */
export function matchesSearchQuery(exercise: Exercise, query: string): boolean {
    const words = normalizeSearchText(query).split(/\s+/).filter(Boolean);

    if (words.length === 0) {
        return true;
    }

    const name = normalizeSearchText(
        [exercise.name, exercise.nameEn].filter(Boolean).join(" ")
    );

    return words.every((word) => name.includes(word));
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
 *   мышечные группы (целевые или вспомогательные);
 * - по названию — см. matchesSearchQuery; сочетается с остальным по "И";
 * - по площадке — остаются упражнения, которые можно выполнить на её
 *   оборудовании (см. isExerciseAvailableAt). Оборудование площадки
 *   передаётся отдельным аргументом: сам фильтр хранит только id. Пока
 *   оборудование неизвестно (площадка не найдена или не загружена),
 *   отбор по площадке не применяется.
 *
 * Если выбраны мышцы, упражнения упорядочиваются по релевантности: сначала те,
 * где больше выбранных мышц — целевые, а не вспомогательные. Среди равных
 * сохраняется исходный порядок.
 */
export function filterExercises(
    exercises: Exercise[],
    filters: ExerciseFilterState,
    playgroundEquipment?: PlaygroundEquipment[]
): Exercise[] {
    const matching = exercises.filter((exercise) => {
        if (
            filters.movementTypes.length > 0 &&
            !filters.movementTypes.includes(exercise.movementType)
        ) {
            return false;
        }

        if (!matchesSearchQuery(exercise, filters.query)) {
            return false;
        }

        if (
            filters.playgroundId !== "" &&
            playgroundEquipment !== undefined &&
            !isExerciseAvailableAt(exercise, playgroundEquipment)
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
// Фильтры в адресной строке:
// ?movement=pull,push&muscles=lats,biceps&playground=<id>&q=подтяг
//
// Так выбранные фильтры и поиск переживают переход на страницу
// упражнения и возврат назад, а подборку можно отправить ссылкой.
// ---------------------------------------------------------------------

const MOVEMENT_PARAM = "movement";
const MUSCLES_PARAM = "muscles";
const PLAYGROUND_PARAM = "playground";
const QUERY_PARAM = "q";

/** id площадки в ссылке длиннее этого не бывает — лишнее отбрасываем. */
const MAX_PLAYGROUND_ID_LENGTH = 100;

/** Длиннее названия упражнения запрос быть не может — ограничиваем и ввод, и ссылку. */
export const MAX_EXERCISE_QUERY_LENGTH = 100;

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
        playgroundId: (params.get(PLAYGROUND_PARAM) ?? "").slice(
            0,
            MAX_PLAYGROUND_ID_LENGTH
        ),
        query: (params.get(QUERY_PARAM) ?? "").slice(0, MAX_EXERCISE_QUERY_LENGTH),
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

    if (filters.playgroundId !== "") {
        next.set(PLAYGROUND_PARAM, filters.playgroundId);
    } else {
        next.delete(PLAYGROUND_PARAM);
    }

    if (filters.query !== "") {
        next.set(QUERY_PARAM, filters.query);
    } else {
        next.delete(QUERY_PARAM);
    }

    return next;
}
