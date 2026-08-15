import type { NewDiaryNote } from "../types/newDiaryNote";
import type { ValidationError, ValidationResult } from "./index";

import {
    MAX_NOTE_TITLE_LENGTH,
} from "../constants/diaryNotes";

import {
    MAX_WORKOUT_ENTRY_PHOTOS,
} from "../constants/workoutEntryPhotos";

/**
 * Заметка намеренно почти без правил — единственное обязательное
 * поле это текст (UX-DIARY-V2 §5, §19.2, §19.5).
 */
export function validateDiaryNote(
    note: NewDiaryNote
): ValidationResult {
    const errors: ValidationError[] = [];

    if (note.text.trim().length === 0) {
        errors.push({
            field: "text",
            message: "Напишите текст заметки.",
        });
    }

    if (note.title.length > MAX_NOTE_TITLE_LENGTH) {
        errors.push({
            field: "title",
            message: `Заголовок не должен превышать ${MAX_NOTE_TITLE_LENGTH} символов.`,
        });
    }

    if (note.photos.length > MAX_WORKOUT_ENTRY_PHOTOS) {
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
