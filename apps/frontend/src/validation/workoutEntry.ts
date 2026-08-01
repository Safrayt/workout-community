import type {
    NewWorkoutEntry,
} from "../types/newWorkoutEntry";

import type {
    ValidationResult,
    ValidationError,
} from "./index";

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

    return {
        valid: errors.length === 0,
        errors,
    };
}