import type { Exercise } from "../types/exercise";
import type { ExerciseMediaChanges } from "../types/newExercise";

import { ApiError } from "../api/errors";

type MediaActions = {
    uploadPhoto: (id: string, file: File) => Promise<Exercise>;
    removePhoto: (id: string) => Promise<Exercise>;
    uploadVideo: (id: string, file: File) => Promise<Exercise>;
    removeVideo: (id: string) => Promise<Exercise>;
};

function errorText(error: unknown): string {
    return error instanceof ApiError || error instanceof Error
        ? error.message
        : "неизвестная ошибка";
}

/**
 * Применяет к уже сохранённому упражнению выбранные в форме изменения
 * фото и видео. Фото и видео обрабатываются независимо: если не вышло
 * с одним, второе всё равно будет выполнено. Возвращает тексты ошибок —
 * пустой список означает, что всё получилось.
 */
export async function applyExerciseMedia(
    exerciseId: string,
    changes: ExerciseMediaChanges,
    actions: MediaActions
): Promise<string[]> {
    const errors: string[] = [];

    try {
        if (changes.photoFile) {
            await actions.uploadPhoto(exerciseId, changes.photoFile);
        } else if (changes.removePhoto) {
            await actions.removePhoto(exerciseId);
        }
    } catch (error: unknown) {
        errors.push(`Фото: ${errorText(error)}`);
    }

    try {
        if (changes.videoFile) {
            await actions.uploadVideo(exerciseId, changes.videoFile);
        } else if (changes.removeVideo) {
            await actions.removeVideo(exerciseId);
        }
    } catch (error: unknown) {
        errors.push(`Видео: ${errorText(error)}`);
    }

    return errors;
}
