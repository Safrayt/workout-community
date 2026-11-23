export type NewWorkoutEntryPhoto = {

    id: string;

    url: string;

    isMain: boolean;

};

/**
 * Что можно подставить в новую запись при переходе на страницу её
 * создания (через состояние адреса): например, итог пройденной схемы
 * программы. Остальные поля остаются как у пустой записи.
 */
export type WorkoutEntryPrefill = Partial<
    Pick<
        NewWorkoutEntry,
        | "title"
        | "description"
        | "programId"
        | "programSection"
        | "programScheme"
        | "programSectionId"
        | "programSchemeId"
    >
>;

export type NewWorkoutEntry = {

    date: string;

    timeOfDay: string;

    tags: string[];

    playgroundId: string;

    /** "" — программа не указана (см. UX-документ «Раздел Программы»,
     *  п.5: указание программы в записи дневника необязательно). */
    programId: string;

    /** Раздел и схема выбираются из структуры программы: названия —
     *  снимок для показа, id указывают на элементы структуры версии
     *  (по ним потом находятся упражнения схемы). "" — не выбраны. У
     *  старых записей id пусты, а название — текст, введённый вручную. */
    programSection: string;

    programScheme: string;

    programSectionId: string;

    programSchemeId: string;

    /** Версия программы, на которой записана тренировка (только при
     *  редактировании существующей записи): разделы и схемы
     *  предлагаются именно из неё, а не из текущей версии программы. */
    programVersionId?: string;

    title: string;

    description: string;

    photos: NewWorkoutEntryPhoto[];

    hideFromFeed: boolean;

    isPrivate: boolean;

};