export type TimeOfDay =
    | "morning"
    | "day"
    | "evening"
    | "night";

export type WorkoutEntryPhoto = {

    id: string;

    url: string;

    isMain?: boolean;

};

export type WorkoutEntry = {

    id: string;

    userId: string;

    playgroundId?: string;

    /** Связь с программой (см. UX-документ «Раздел Программы», п.5) —
     *  версия фиксируется на сервере в момент создания записи и не
     *  меняется, даже если программа позже обновится (п.6). */
    programId?: string;

    programVersionId?: string;

    programSection?: string;

    programScheme?: string;

    date: string;

    timeOfDay?: TimeOfDay;

    tags?: string[];

    title: string;

    description?: string;

    photos?: WorkoutEntryPhoto[];

    createdAt: string;

    /** Не показывать во вкладке "Все записи" на Главной (но видна в
     *  "Подписки" и на странице своего дневника). */
    hideFromFeed?: boolean;

    /** Видна только автору (и администратору) — не показывается ни в
     *  одной вкладке Главной и не видна другим на странице дневника. */
    isPrivate?: boolean;

};