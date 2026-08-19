/**
 * View-модель метки на карте "Активность на площадках" (UX-HOME §9).
 * Карта не работает с сырыми DiaryRecord напрямую — сюда уже
 * агрегированы все записи одной площадки за последние 24 часа.
 */
export type HomeActivityMarker = {
    playgroundId: string;

    hasWorkout: boolean;

    hasNote: boolean;

    workoutCount: number;

    noteCount: number;

    /** createdAt самой свежей записи, вошедшей в агрегацию. */
    lastActivityAt: string;
};
