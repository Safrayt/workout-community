/**
 * Конкретный случай выполнения комплекса конкретным пользователем.
 * Звёзды считает сервер — на клиенте это поле всегда только читаем.
 */
export type ComplexCompletion = {

    id: string;

    complexId: string;

    userId: string;

    resultTimeSeconds?: number;

    resultReps?: number;

    resultSets?: number;

    resultRounds?: number;

    resultDurationSeconds?: number;

    resultCount?: number;

    stars: number;

    /**
     * Подтверждающая запись дневника. Отсутствует, если запись была
     * удалена (см. п.27 UX-документа) — в этом случае выполнение
     * всё равно остаётся в истории.
     */
    diaryEntryId?: string;

    completedDate: string;

    createdAt: string;

    updatedAt: string;

};
