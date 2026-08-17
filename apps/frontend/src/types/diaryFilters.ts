import type { DiaryRecordType } from "./diaryRecord";

/**
 * Точность фильтра "Дата" — конкретный день, весь месяц или весь
 * год. Формат значения в DiaryFilters.date зависит от этого поля:
 * day → "YYYY-MM-DD", month → "YYYY-MM", year → "YYYY".
 */
export type DiaryDatePrecision = "day" | "month" | "year";

export type DiaryFilters = {

    /** "all" — оба типа записей (UX-DIARY-V2 §12, §15). */
    recordType: DiaryRecordType | "all";

    /** id площадки или "" — фильтр не активен. */
    playgroundId: string;

    /** "" — фильтр не активен. Формат см. DiaryDatePrecision. */
    date: string;

    datePrecision: DiaryDatePrecision;

    /** Выбранные теги — AND между собой (UX-DIARY §18). */
    tags: string[];

};

export const emptyDiaryFilters: DiaryFilters = {
    recordType: "all",
    playgroundId: "",
    date: "",
    datePrecision: "day",
    tags: [],
};
