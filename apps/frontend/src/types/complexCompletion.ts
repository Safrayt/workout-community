/**
 * Конкретный случай выполнения комплекса конкретным пользователем.
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
