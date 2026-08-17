import type { Comment } from "../types/comment";
import type { DiaryRecordType } from "../types/diaryRecord";

/** Комментарии одной записи, от старых к новым — как обычная переписка. */
export function getCommentsForRecord(
    comments: Comment[],
    recordId: string,
    recordType: DiaryRecordType
) {
    return comments
        .filter(
            (comment) =>
                comment.recordId === recordId &&
                comment.recordType === recordType
        )
        .sort(
            (a, b) =>
                a.createdAt.localeCompare(b.createdAt)
        );
}
