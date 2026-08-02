import type {
    NewWorkoutEntry,
} from "../types/newWorkoutEntry";

import type {
    ValidationResult,
    ValidationError,
} from "./index";

import {
    MAX_TAGS_PER_ENTRY,
} from "../utils/workoutTags";

export function validateWorkoutEntry(
    entry: NewWorkoutEntry
): ValidationResult {

    const errors: ValidationError[] = [];

    if (
        entry.date.trim().length === 0
    ) {
        errors.push({
            field: "date",
            message: "Укажите дату тренировки.",
        });
    }

    if (
        entry.title.trim().length === 0
    ) {
        errors.push({
            field: "title",
            message: "Введите название тренировки.",
        });
    }

    if (
        entry.tags.length > MAX_TAGS_PER_ENTRY
    ) {
        errors.push({
            field: "tags",
            message: `Можно добавить не более ${MAX_TAGS_PER_ENTRY} тегов.`,
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}