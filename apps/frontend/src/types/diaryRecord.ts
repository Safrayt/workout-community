import type { WorkoutEntry } from "./workoutEntry";
import type { DiaryNote } from "./diaryNote";

export type DiaryRecordType = "workout" | "note";

export type DiaryRecord =
    | { type: "workout"; date: string; createdAt: string; data: WorkoutEntry }
    | { type: "note"; date: string; createdAt: string; data: DiaryNote };
