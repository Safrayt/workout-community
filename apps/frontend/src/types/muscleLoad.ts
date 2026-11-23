import type { MuscleGroupKey } from "./exercise";

/**
 * Мышцы, которые пользователь нагружал за период по записям своего
 * дневника (схемы программ и выполненные комплексы).
 */
export type MuscleLoad = {
    /** Границы периода, «ГГГГ-ММ-ДД». */
    dateFrom: string;
    dateTo: string;

    /** Мышцы, на которые нацелено хотя бы одно упражнение. */
    target: MuscleGroupKey[];

    /** Мышцы, которые работают только в помощь. */
    auxiliary: MuscleGroupKey[];

    /** Записей дневника за период, видимых смотрящему. */
    entriesTotal: number;

    /** Из них дали упражнения из базы (есть схема программы или комплекс). */
    entriesWithData: number;
};
