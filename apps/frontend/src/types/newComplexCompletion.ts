export type NewComplexCompletion = {

    complexId: string;

    resultTimeSeconds?: number;

    resultReps?: number;

    resultSets?: number;

    resultRounds?: number;

    resultDurationSeconds?: number;

    resultCount?: number;

    /** Не выбрана — undefined, специально отвязана — обрабатывается
     * отдельным флагом clearDiaryEntry при редактировании. */
    diaryEntryId?: string;

    completedDate: string;

    /** Результат внесён из помощника (прохождение комплекса с
     *  таймерами). Ставится только при создании. */
    viaAssistant?: boolean;

};
