import type { MovementType, MuscleGroupKey } from "./exercise";

/**
 * Значение формы добавления/редактирования упражнения (текстовая
 * часть). Фото и видео в него не входят — они загружаются отдельно
 * (см. ExerciseForm и api/exercises.ts).
 */
export type NewExercise = {
    name: string;
    nameEn: string;

    /** Пустая строка — тип ещё не выбран (проверяется при отправке). */
    movementType: MovementType | "";

    targetMuscles: MuscleGroupKey[];
    auxiliaryMuscles: MuscleGroupKey[];

    equipment: string[];
    description: string;
    advantages: string[];
    disadvantages: string[];
    technique: string[];
    features: string[];
    suitableFor: string[];
};

export const EMPTY_NEW_EXERCISE: NewExercise = {
    name: "",
    nameEn: "",
    movementType: "",
    targetMuscles: [],
    auxiliaryMuscles: [],
    equipment: [],
    description: "",
    advantages: [],
    disadvantages: [],
    technique: [],
    features: [],
    suitableFor: [],
};

/**
 * Что сделать с фото и видео при сохранении упражнения. Файлы
 * загружаются отдельными запросами уже после сохранения текста (см.
 * utils/exerciseMedia.ts).
 */
export type ExerciseMediaChanges = {
    /** Выбран новый файл — он заменит текущий. */
    photoFile: File | null;
    /** Убрать текущее фото, не загружая новое. */
    removePhoto: boolean;
    videoFile: File | null;
    removeVideo: boolean;
};

export const NO_MEDIA_CHANGES: ExerciseMediaChanges = {
    photoFile: null,
    removePhoto: false,
    videoFile: null,
    removeVideo: false,
};
