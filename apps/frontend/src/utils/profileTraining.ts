import type { Complex } from "../types/complex";
import type { ComplexCompletion } from "../types/complexCompletion";
import type { WorkoutEntry } from "../types/workoutEntry";

import { findBestCompletion, formatCompletionResult } from "./complexResult";

/** Сколько дней после последней тренировки программа считается «идёт сейчас». */
export const ACTIVE_PROGRAM_DAYS = 21;

export type ProfileProgram = {
    programId: string;
    workouts: number;

    /** «ГГГГ-ММ-ДД». */
    firstDate: string;
    lastDate: string;

    /** Последняя тренировка по программе была не так давно. */
    isActive: boolean;

    /** Названия схем, по которым были тренировки (без повторов). */
    schemes: string[];
};

function dayOf(date: string): string {
    return date.slice(0, 10);
}

function daysBetween(fromDay: string, to: Date): number {
    const [year, month, day] = fromDay.split("-").map(Number);
    const from = new Date(year, month - 1, day);
    const today = new Date(to.getFullYear(), to.getMonth(), to.getDate());

    return Math.round((today.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Программы, по которым пользователь тренировался: те тренировочные
 * записи, где в дневнике отмечена программа. Сначала те, что идут
 * сейчас, потом остальные — от недавних к давним.
 */
export function buildProfilePrograms(
    entries: WorkoutEntry[],
    today: Date = new Date()
): ProfileProgram[] {
    const byProgram = new Map<string, ProfileProgram>();

    entries.forEach((entry) => {
        if (!entry.programId) {
            return;
        }

        const day = dayOf(entry.date);
        const scheme = entry.programScheme?.trim();
        const current = byProgram.get(entry.programId);

        if (!current) {
            byProgram.set(entry.programId, {
                programId: entry.programId,
                workouts: 1,
                firstDate: day,
                lastDate: day,
                isActive: false,
                schemes: scheme ? [scheme] : [],
            });

            return;
        }

        current.workouts += 1;

        if (day < current.firstDate) {
            current.firstDate = day;
        }

        if (day > current.lastDate) {
            current.lastDate = day;
        }

        if (scheme && !current.schemes.includes(scheme)) {
            current.schemes.push(scheme);
        }
    });

    const programs = [...byProgram.values()];

    programs.forEach((program) => {
        program.isActive =
            daysBetween(program.lastDate, today) <= ACTIVE_PROGRAM_DAYS;
    });

    return programs.sort(
        (a, b) =>
            Number(b.isActive) - Number(a.isActive) ||
            b.lastDate.localeCompare(a.lastDate)
    );
}

export type ProfileComplex = {
    complex: Complex;

    /** Сколько раз выполнен комплекс. */
    attempts: number;

    /** Дата последнего выполнения, «ГГГГ-ММ-ДД». */
    lastDate: string;

    /** Лучший результат, как в таблице результатов («04:52», «120 повторений»). */
    bestResult: string;
};

/**
 * Комплексы, которые выполнял пользователь, и его лучший результат в
 * каждом. Выполнения комплексов, которых больше нет в каталоге,
 * пропускаются. Сначала те, что выполнялись недавно.
 */
export function buildProfileComplexes(
    completions: ComplexCompletion[],
    complexes: Complex[]
): ProfileComplex[] {
    const byComplex = new Map<string, ComplexCompletion[]>();

    completions.forEach((completion) => {
        const list = byComplex.get(completion.complexId) ?? [];

        list.push(completion);
        byComplex.set(completion.complexId, list);
    });

    const result: ProfileComplex[] = [];

    complexes.forEach((complex) => {
        const list = byComplex.get(complex.id);

        if (!list || list.length === 0) {
            return;
        }

        const best = findBestCompletion(complex, list);

        result.push({
            complex,
            attempts: list.length,
            lastDate: list
                .map((completion) => dayOf(completion.completedDate))
                .reduce((latest, day) => (day > latest ? day : latest)),
            bestResult: best ? formatCompletionResult(complex, best) : "",
        });
    });

    return result.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

const MONTHS_GENITIVE = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
];

/** «2026-11-19» → «19 ноября 2026». */
export function formatProfileDate(date: string): string {
    const [year, month, day] = dayOf(date).split("-").map(Number);

    return `${day} ${MONTHS_GENITIVE[month - 1]} ${year}`;
}
