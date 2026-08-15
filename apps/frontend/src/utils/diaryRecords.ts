import type { WorkoutEntry } from "../types/workoutEntry";
import type { DiaryNote } from "../types/diaryNote";
import type { DiaryRecord } from "../types/diaryRecord";

/**
 * Единая хронологическая лента дневника (UX-DIARY-V2 §2, §8):
 * тренировки и заметки — это два типа одной сущности "Запись
 * дневника", а не два отдельных раздела.
 */
export function buildDiaryRecords(
    entries: WorkoutEntry[],
    notes: DiaryNote[]
): DiaryRecord[] {
    const workoutRecords: DiaryRecord[] = entries.map(
        (entry) => ({
            type: "workout",
            date: entry.date,
            createdAt: entry.createdAt,
            data: entry,
        })
    );

    const noteRecords: DiaryRecord[] = notes.map(
        (note) => ({
            type: "note",
            date: note.date,
            createdAt: note.createdAt,
            data: note,
        })
    );

    return [...workoutRecords, ...noteRecords].sort(
        (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt)
    );
}
