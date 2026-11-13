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

    /** Свободный текст — раздел/схема программы не стандартизированы
     *  (п.10), поэтому это просто то, что ввёл пользователь, а не
     *  ссылка на элемент структуры версии. */
    programSection: string;

    programScheme: string;

    title: string;

    description: string;

    photos: NewWorkoutEntryPhoto[];

    hideFromFeed: boolean;

    isPrivate: boolean;

};