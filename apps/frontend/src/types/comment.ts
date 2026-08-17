import type { DiaryRecordType } from "./diaryRecord";

export type Comment = {
    id: string;

    /** id записи тренировки или заметки, к которой оставлен комментарий. */
    recordId: string;

    recordType: DiaryRecordType;

    userId: string;

    text: string;

    createdAt: string;
};
