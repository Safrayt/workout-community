import type { WorkoutEntry } from "../types/workoutEntry";
import type { Playground } from "../types/playground";
import type { DiaryFilters } from "../types/diaryFilters";

/**
 * Карта, календарь и теги — не независимые блоки, а инструменты
 * фильтрации одного и того же списка (UX-DIARY §2, §48). Поэтому
 * вся логика комбинирования живёт в одном месте.
 */
export function filterDiaryEntries(
    entries: WorkoutEntry[],
    filters: DiaryFilters
): WorkoutEntry[] {
    return entries.filter((entry) => {
        if (
            filters.playgroundId &&
            entry.playgroundId !== filters.playgroundId
        ) {
            return false;
        }

        if (
            filters.date &&
            entry.date !== filters.date
        ) {
            return false;
        }

        if (
            filters.tags.length > 0 &&
            !filters.tags.every(
                (tag) => (entry.tags ?? []).includes(tag)
            )
        ) {
            return false;
        }

        return true;
    });
}

export function hasActiveDiaryFilters(
    filters: DiaryFilters
): boolean {
    return Boolean(filters.playgroundId) ||
        Boolean(filters.date) ||
        filters.tags.length > 0;
}

export function countActiveDiaryFilters(
    filters: DiaryFilters
): number {
    return (
        (filters.playgroundId ? 1 : 0) +
        (filters.date ? 1 : 0) +
        filters.tags.length
    );
}

/** Сколько записей приходится на каждую площадку (для popup карты). */
export function getEntryCountsByPlayground(
    entries: WorkoutEntry[]
): Record<string, number> {
    const counts: Record<string, number> = {};

    entries.forEach((entry) => {
        if (!entry.playgroundId) {
            return;
        }

        counts[entry.playgroundId] =
            (counts[entry.playgroundId] ?? 0) + 1;
    });

    return counts;
}

/** Сколько записей приходится на каждую дату (для точек в календаре). */
export function getEntryCountsByDate(
    entries: WorkoutEntry[]
): Record<string, number> {
    const counts: Record<string, number> = {};

    entries.forEach((entry) => {
        counts[entry.date] =
            (counts[entry.date] ?? 0) + 1;
    });

    return counts;
}

/**
 * Только те площадки, где пользователь реально тренировался хотя бы
 * раз (UX-DIARY §7) — не все площадки платформы.
 */
export function getPlaygroundsWithEntries(
    entries: WorkoutEntry[],
    playgrounds: Playground[]
): Playground[] {
    const usedIds = new Set(
        entries
            .map((entry) => entry.playgroundId)
            .filter((id): id is string => Boolean(id))
    );

    return playgrounds.filter(
        (playground) => usedIds.has(playground.id)
    );
}
