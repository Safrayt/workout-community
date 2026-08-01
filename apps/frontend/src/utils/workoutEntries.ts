import type { WorkoutEntry } from "../types/workoutEntry";

export function getUserWorkoutEntries(
    entries: WorkoutEntry[],
    userId: string
) {
    return entries
        .filter(
            (entry) =>
                entry.userId === userId
        )
        .sort(
            (a, b) =>
                b.date.localeCompare(a.date)
        );
}