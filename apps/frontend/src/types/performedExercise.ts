/** Что считают подходы: повторения или секунды. */
export type PerformedExerciseUnit = "reps" | "seconds";

/**
 * Упражнение, выполненное в тренировке, с результатом каждого подхода
 * (например, 5, 4, 2). exerciseId — упражнение из базы (по нему считается
 * прогресс); без него это упражнение «своим текстом».
 */
export type PerformedExercise = {
    exerciseId?: string;

    name: string;

    unit: PerformedExerciseUnit;

    sets: number[];

    /** Вес со знаком: плюс — утяжелитель, минус — помощь (резинка,
     *  гравитрон). Нет — без дополнительного веса. */
    weightKg?: number;
};

/**
 * То же в форме записи: key — стабильный ключ строки для React, пока
 * её правят и переставляют; 0 в sets — подход, в который число ещё не
 * вписано (при сохранении такие подходы отбрасываются).
 */
export type NewPerformedExercise = PerformedExercise & {
    key: string;
};
