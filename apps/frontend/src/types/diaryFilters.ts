import type { DiaryRecordType } from "./diaryRecord";

export type DiaryFilters = {

    /** "all" — оба типа записей (UX-DIARY-V2 §12, §15). */
    recordType: DiaryRecordType | "all";

    /** id площадки или "" — фильтр не активен. */
    playgroundId: string;

    /** Дата в формате YYYY-MM-DD или "" — фильтр не активен. */
    date: string;

    /** Выбранные теги — AND между собой (UX-DIARY §18). */
    tags: string[];

};

export const emptyDiaryFilters: DiaryFilters = {
    recordType: "all",
    playgroundId: "",
    date: "",
    tags: [],
};
