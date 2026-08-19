import type { DiaryRecord } from "../types/diaryRecord";
import type { User } from "../types/user";
import type { Playground } from "../types/playground";
import type { Comment } from "../types/comment";
import type {
    HomeFeedMode,
    HomeFeedRecord,
} from "../types/homeFeedRecord";

import { HOME_FEED_DAILY_USER_LIMIT } from "../constants/home";
import { getPlaygroundById } from "./playgrounds";
import { getCommentsForRecord } from "./comments";

/** Публичные записи сообщества — приватный дневник в Feed не попадает (UX-HOME §6). */
export function getPublicRecords(
    records: DiaryRecord[],
    users: User[]
): DiaryRecord[] {
    return records.filter((record) => {
        const author = users.find(
            (user) => user.id === record.data.userId
        );

        return Boolean(author?.privacySettings.diaryVisible);
    });
}

export function sortRecordsByCreatedAtDesc(
    records: DiaryRecord[]
): DiaryRecord[] {
    return [...records].sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
}

/**
 * Не более HOME_FEED_DAILY_USER_LIMIT записей одного пользователя за
 * один календарный день публикации (по createdAt, не по activityDate).
 * Ограничение применяется до pagination, records должны уже быть
 * отсортированы по createdAt DESC — тогда для каждого дня остаются
 * самые свежие (UX-HOME §15–17).
 */
export function applyDailyUserLimit(
    sortedRecords: DiaryRecord[],
    limit: number = HOME_FEED_DAILY_USER_LIMIT
): DiaryRecord[] {
    const countByUserAndDay = new Map<string, number>();

    return sortedRecords.filter((record) => {
        const day = record.createdAt.slice(0, 10);
        const key = `${record.data.userId}:${day}`;

        const countSoFar = countByUserAndDay.get(key) ?? 0;

        if (countSoFar >= limit) {
            return false;
        }

        countByUserAndDay.set(key, countSoFar + 1);

        return true;
    });
}

/**
 * Полный конвейер ленты (UX-HOME §17): все публичные записи →
 * сортировка по createdAt DESC → дневной лимит → фильтр по вкладке.
 * Порядок важен для корректной pagination — лимит должен применяться
 * до нарезки на страницы, а не скрываться на UI-уровне.
 */
export function getFeedRecords(
    records: DiaryRecord[],
    users: User[],
    mode: HomeFeedMode,
    followingIds: string[]
): DiaryRecord[] {
    const publicRecords = getPublicRecords(records, users);
    const sorted = sortRecordsByCreatedAtDesc(publicRecords);
    const limited = applyDailyUserLimit(sorted);

    if (mode === "following") {
        return limited.filter((record) =>
            followingIds.includes(record.data.userId)
        );
    }

    return limited;
}

/**
 * Собирает view-модель карточки (автор, площадка, число
 * комментариев) поверх доменной модели, не создавая отдельной
 * сущности FeedPost (UX-HOME §33).
 */
export function buildHomeFeedRecords(
    records: DiaryRecord[],
    users: User[],
    playgrounds: Playground[],
    comments: Comment[]
): HomeFeedRecord[] {
    const result: HomeFeedRecord[] = [];

    for (const record of records) {
        const author = users.find(
            (user) => user.id === record.data.userId
        );

        if (!author) {
            continue;
        }

        const playground = record.data.playgroundId
            ? getPlaygroundById(playgrounds, record.data.playgroundId)
            : undefined;

        const commentsCount = getCommentsForRecord(
            comments,
            record.data.id,
            record.type
        ).length;

        result.push({
            record,
            author,
            playground,
            commentsCount,
        });
    }

    return result;
}
