export type DiaryFilters = {

    /** id площадки или "" — фильтр не активен. */
    playgroundId: string;

    /** Дата в формате YYYY-MM-DD или "" — фильтр не активен. */
    date: string;

    /** Выбранные теги — AND между собой (UX-DIARY §18). */
    tags: string[];

};

export const emptyDiaryFilters: DiaryFilters = {
    playgroundId: "",
    date: "",
    tags: [],
};
