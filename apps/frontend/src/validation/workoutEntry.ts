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

import {
    MAX_WORKOUT_ENTRY_PHOTOS,
} from "../constants/workoutEntryPhotos";

import {
    getTodayDateString,
} from "../utils/today";

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
    } else if (
        entry.date > getTodayDateString()
    ) {
        errors.push({
            field: "date",
            message: "Нельзя выбрать дату в будущем.",
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

    if (
        entry.photos.length > MAX_WORKOUT_ENTRY_PHOTOS
    ) {
        errors.push({
            field: "photos",
            message: `Можно загрузить не более ${MAX_WORKOUT_ENTRY_PHOTOS} фотографий.`,
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}