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

/**
 * Число комментариев у каждой записи за один проход по комментариям —
 * для списков, где счётчик нужен у многих карточек (дневник, профиль).
 * Ключ — recordKey(id, type); читать через getRecordCommentsCount.
 */
export function countCommentsByRecord(comments: Comment[]): Map<string, number> {
    const counts = new Map<string, number>();

    for (const comment of comments) {
        const key = recordKey(comment.recordId, comment.recordType);

        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
}

export function getRecordCommentsCount(
    counts: Map<string, number>,
    recordId: string,
    recordType: DiaryRecordType
): number {
    return counts.get(recordKey(recordId, recordType)) ?? 0;
}

// id записи тренировки и заметки могут совпадать, поэтому ключ — пара.
function recordKey(recordId: string, recordType: DiaryRecordType): string {
    return `${recordType}:${recordId}`;
}
