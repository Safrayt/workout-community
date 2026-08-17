import type { WorkoutEntry } from "../types/workoutEntry";
import type { DiaryNote } from "../types/diaryNote";
import type { DiaryRecord } from "../types/diaryRecord";
import type { Playground } from "../types/playground";
import type { DiaryFilters } from "../types/diaryFilters";

/**
 * Карта, календарь, тип и теги — не независимые блоки, а инструменты
 * фильтрации одной и той же ленты записей (UX-DIARY §2, §48;
 * UX-DIARY-V2 §12). Поэтому вся логика комбинирования живёт в одном
 * месте.
 */
export function filterDiaryRecords(
    records: DiaryRecord[],
    filters: DiaryFilters
): DiaryRecord[] {
    return records.filter((record) => {
        if (
            filters.recordType !== "all" &&
            record.type !== filters.recordType
        ) {
            return false;
        }

        if (
            filters.playgroundId &&
            record.data.playgroundId !== filters.playgroundId
        ) {
            return false;
        }

        if (filters.date) {
            if (filters.datePrecision === "day") {
                if (record.date !== filters.date) {
                    return false;
                }
            } else if (!record.date.startsWith(filters.date)) {
                // month → "YYYY-MM", year → "YYYY" — оба случая
                // сводятся к проверке префикса даты записи.
                return false;
            }
        }

        if (
            filters.tags.length > 0 &&
            !filters.tags.every(
                (tag) => (record.data.tags ?? []).includes(tag)
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
    return filters.recordType !== "all" ||
        Boolean(filters.playgroundId) ||
        Boolean(filters.date) ||
        filters.tags.length > 0;
}

export function countActiveDiaryFilters(
    filters: DiaryFilters
): number {
    return (
        (filters.recordType !== "all" ? 1 : 0) +
        (filters.playgroundId ? 1 : 0) +
        (filters.date ? 1 : 0) +
        filters.tags.length
    );
}

/** Сколько записей приходится на каждую площадку (для popup карты). */
export function getEntryCountsByPlayground(
    records: DiaryRecord[]
): Record<string, number> {
    const counts: Record<string, number> = {};

    records.forEach((record) => {
        const playgroundId = record.data.playgroundId;

        if (!playgroundId) {
            return;
        }

        counts[playgroundId] =
            (counts[playgroundId] ?? 0) + 1;
    });

    return counts;
}

/** Сколько записей каждого типа приходится на каждую дату (для календаря). */
export function getEntryCountsByDate(
    records: DiaryRecord[]
): Record<string, { workout: number; note: number }> {
    const counts: Record<string, { workout: number; note: number }> = {};

    records.forEach((record) => {
        const current = counts[record.date] ?? { workout: 0, note: 0 };

        counts[record.date] = {
            ...current,
            [record.type]: current[record.type] + 1,
        };
    });

    return counts;
}

/**
 * Только те площадки, с которыми реально связана хотя бы одна
 * запись пользователя (тренировка или заметка) — не все площадки
 * платформы (UX-DIARY §7; UX-DIARY-V2 §11).
 */
export function getPlaygroundsWithEntries(
    records: DiaryRecord[],
    playgrounds: Playground[]
): Playground[] {
    const usedIds = new Set(
        records
            .map((record) => record.data.playgroundId)
            .filter((id): id is string => Boolean(id))
    );

    return playgrounds.filter(
        (playground) => usedIds.has(playground.id)
    );
}

/**
 * Записи (обоих типов) пользователя, связанные с конкретной
 * площадкой — используется на странице площадки, "Мои записи"
 * (UX-DIARY-V2 §14).
 */
export function getRecordsForPlayground(
    entries: WorkoutEntry[],
    notes: DiaryNote[],
    userId: string,
    playgroundId: string
): DiaryRecord[] {
    const matchingEntries = entries.filter(
        (entry) =>
            entry.userId === userId &&
            entry.playgroundId === playgroundId
    );

    const matchingNotes = notes.filter(
        (note) =>
            note.userId === userId &&
            note.playgroundId === playgroundId
    );

    return [
        ...matchingEntries.map((entry) => ({
            type: "workout" as const,
            date: entry.date,
            createdAt: entry.createdAt,
            data: entry,
        })),
        ...matchingNotes.map((note) => ({
            type: "note" as const,
            date: note.date,
            createdAt: note.createdAt,
            data: note,
        })),
    ].sort(
        (a, b) => b.date.localeCompare(a.date)
    );
}
