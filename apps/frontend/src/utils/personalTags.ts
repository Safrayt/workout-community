import type { PersonalTag } from "../types/personalTag";
import type { WorkoutEntry } from "../types/workoutEntry";
import type { DiaryNote } from "../types/diaryNote";

/**
 * Начальные и конечные пробелы удаляются, внутренние — схлопываются
 * (UX-PERSONAL-TAGS §11).
 */
export function normalizeTagName(name: string): string {
    return name.trim().replace(/\s+/g, " ");
}

/**
 * Уникальность проверяется без учёта регистра — "Турник", "турник"
 * и "ТУРНИК" не могут существовать как три разных тега. Отображается
 * при этом ровно то, что ввёл пользователь (UX-PERSONAL-TAGS §12).
 */
export function isTagNameTaken(
    tags: PersonalTag[],
    userId: string,
    name: string,
    excludeId?: string
): boolean {
    const normalized = name.toLowerCase();

    return tags.some(
        (tag) =>
            tag.userId === userId &&
            tag.id !== excludeId &&
            tag.name.toLowerCase() === normalized
    );
}

export function getTagUsageCount(
    entries: WorkoutEntry[],
    notes: DiaryNote[],
    userId: string,
    tagName: string
): number {
    const entriesCount = entries.filter(
        (entry) =>
            entry.userId === userId &&
            (entry.tags ?? []).includes(tagName)
    ).length;

    const notesCount = notes.filter(
        (note) =>
            note.userId === userId &&
            (note.tags ?? []).includes(tagName)
    ).length;

    return entriesCount + notesCount;
}

/**
 * По умолчанию — сначала наиболее используемые теги
 * (UX-PERSONAL-TAGS §18).
 */
export function sortTagsByUsage(
    tags: PersonalTag[],
    entries: WorkoutEntry[],
    notes: DiaryNote[],
    userId: string
): PersonalTag[] {
    return [...tags].sort(
        (a, b) =>
            getTagUsageCount(entries, notes, userId, b.name) -
            getTagUsageCount(entries, notes, userId, a.name)
    );
}

export function filterTagsBySearch(
    tags: PersonalTag[],
    search: string
): PersonalTag[] {
    const trimmed = search.trim().toLowerCase();

    if (trimmed.length === 0) {
        return tags;
    }

    return tags.filter(
        (tag) =>
            tag.name.toLowerCase().includes(trimmed)
    );
}
