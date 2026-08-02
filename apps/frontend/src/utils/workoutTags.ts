import type { WorkoutEntry } from "../types/workoutEntry";

export const MAX_TAGS_PER_ENTRY = 10;

export const MAX_USER_TAGS = 50;

export function getUserTags(
    entries: WorkoutEntry[],
    userId: string
) {
    const tagSet = new Set<string>();

    entries
        .filter(
            (entry) =>
                entry.userId === userId
        )
        .forEach(
            (entry) => {
                (entry.tags ?? []).forEach(
                    (tag) => tagSet.add(tag)
                );
            }
        );

    return Array.from(tagSet).sort(
        (a, b) => a.localeCompare(b, "ru")
    );
}

export function filterEntriesByTags(
    entries: WorkoutEntry[],
    selectedTags: string[]
) {
    if (selectedTags.length === 0) {
        return entries;
    }

    return entries.filter(
        (entry) =>
            selectedTags.every(
                (tag) => (entry.tags ?? []).includes(tag)
            )
    );
}