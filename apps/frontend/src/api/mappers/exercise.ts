import { resolveMediaUrl } from "../media";

import type { Exercise, MovementType, MuscleGroupKey } from "../../types/exercise";
import type { NewExercise } from "../../types/newExercise";

/** Упражнение так, как его отдаёт бэкенд (app/models_exercise.py). */
export type ApiExercise = {
    id: string;
    name: string;
    name_en: string | null;
    movement_type: MovementType;
    target_muscles: MuscleGroupKey[];
    auxiliary_muscles: MuscleGroupKey[];
    equipment: string[];
    description: string;
    advantages: string[];
    disadvantages: string[];
    technique: string[];
    features: string[];
    suitable_for: string[];
    photo_url: string | null;
    video_url: string | null;
};

/**
 * Файлы, загруженные через сайт, лежат на бэкенде (/uploads/...), и
 * адрес для браузера нужно достроить (см. resolveMediaUrl). Файлы
 * стартовых упражнений (/exercises/...) — статика самого фронтенда, их
 * адрес остаётся как есть: добавь к нему адрес бэкенда, и ссылка
 * перестала бы работать.
 */
function resolveExerciseMediaUrl(
    url: string | null
): string | undefined {
    if (!url) {
        return undefined;
    }

    return url.startsWith("/uploads/") ? resolveMediaUrl(url) : url;
}

export function mapApiExerciseToExercise(api: ApiExercise): Exercise {
    return {
        id: api.id,
        name: api.name,
        nameEn: api.name_en ?? undefined,
        movementType: api.movement_type,
        targetMuscles: api.target_muscles,
        auxiliaryMuscles: api.auxiliary_muscles,
        equipment: api.equipment,
        description: api.description,
        advantages: api.advantages,
        disadvantages: api.disadvantages,
        technique: api.technique,
        features: api.features,
        suitableFor: api.suitable_for,
        photoUrl: resolveExerciseMediaUrl(api.photo_url),
        videoUrl: resolveExerciseMediaUrl(api.video_url),
    };
}

/** Тело запроса POST/PUT. Фото и видео сюда не входят. */
export function mapNewExerciseToApi(exercise: NewExercise) {
    return {
        name: exercise.name,
        name_en: exercise.nameEn.trim() === "" ? null : exercise.nameEn,
        movement_type: exercise.movementType,
        target_muscles: exercise.targetMuscles,
        auxiliary_muscles: exercise.auxiliaryMuscles,
        equipment: exercise.equipment,
        description: exercise.description,
        advantages: exercise.advantages,
        disadvantages: exercise.disadvantages,
        technique: exercise.technique,
        features: exercise.features,
        suitable_for: exercise.suitableFor,
    };
}
