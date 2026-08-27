import type { DiaryRecord } from "../types/diaryRecord";
import type { User } from "../types/user";
import type { Playground } from "../types/playground";
import type { Comment } from "../types/comment";
import type { Event } from "../types/event";
import type { SystemFeedRecord } from "../types/systemFeedRecord";
import type {
    HomeFeedItem,
    HomeFeedMode,
    HomeFeedRecord,
    SystemFeedItem,
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

/**
 * Системные записи ленты: "создано мероприятие" при появлении
 * нового Event, "новая площадка" при появлении новой Playground.
 * В отличие от записей дневника, это не приватные данные конкретного
 * пользователя — публикация мероприятия или площадки видна всем по
 * определению (это уже видно на Карте площадок/в Мероприятиях), так
 * что здесь нет аналога getPublicRecords/дневного лимита.
 *
 * Сортировка и фильтр по вкладке — по тому же принципу, что и
 * getFeedRecords для записей дневника: во вкладке "following"
 * остаются только записи, созданные пользователями из подписок.
 */
export function getSystemFeedRecords(
    events: Event[],
    playgrounds: Playground[],
    mode: HomeFeedMode,
    followingIds: string[]
): SystemFeedRecord[] {
    const eventRecords: SystemFeedRecord[] = events.map((event) => ({
        type: "event_created",
        createdAt: event.createdAt,
        data: event,
    }));

    const playgroundRecords: SystemFeedRecord[] = playgrounds.map(
        (playground) => ({
            type: "playground_created",
            createdAt: playground.createdAt,
            data: playground,
        })
    );

    const sorted = [...eventRecords, ...playgroundRecords].sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt)
    );

    if (mode === "following") {
        return sorted.filter((record) =>
            followingIds.includes(record.data.creatorId)
        );
    }

    return sorted;
}

/**
 * Объединяет уже отфильтрованные записи дневника и системные записи
 * в один список, отсортированный по времени создания — единая
 * хронология для pagination ленты. View-модели (автор, площадка,
 * счётчик комментариев) на этом шаге ещё не строятся: это дешёвая
 * операция над "сырыми" записями, чтобы можно было сначала обрезать
 * список по visibleCount и не тратить работу на невидимые записи
 * (тот же приём, что раньше применялся только к записям дневника).
 */
export function mergeFeedRawItems(
    diaryRecords: DiaryRecord[],
    systemRecords: SystemFeedRecord[]
): (
    | { kind: "diary"; sortKey: string; record: DiaryRecord }
    | { kind: "system"; sortKey: string; record: SystemFeedRecord }
)[] {
    const diaryItems = diaryRecords.map((record) => ({
        kind: "diary" as const,
        sortKey: record.createdAt,
        record,
    }));

    const systemItems = systemRecords.map((record) => ({
        kind: "system" as const,
        sortKey: record.createdAt,
        record,
    }));

    return [...diaryItems, ...systemItems].sort((a, b) =>
        b.sortKey.localeCompare(a.sortKey)
    );
}

/**
 * Строит view-модель системной записи (резолвит автора — того, кто
 * создал мероприятие/площадку). Если автора не нашли в справочнике
 * пользователей — запись пропускается, как и для записей дневника
 * в buildHomeFeedRecords.
 */
function buildSystemFeedItem(
    record: SystemFeedRecord,
    users: User[]
): SystemFeedItem | undefined {
    const author = users.find((user) => user.id === record.data.creatorId);

    if (!author) {
        return undefined;
    }

    return { record, author };
}

/**
 * Строит финальные view-модели для уже нарезанного по странице
 * списка "сырых" элементов (см. mergeFeedRawItems). Для записей
 * дневника переиспользует buildHomeFeedRecords поэлементно (массив
 * из одного элемента) — так порядок и типы (дневник/система) не
 * перепутаются: buildHomeFeedRecords сам отбрасывает записи без
 * автора, и при массовом вызове длина результата могла бы не
 * совпасть с длиной исходного списка.
 */
export function buildHomeFeedItems(
    rawItems: ReturnType<typeof mergeFeedRawItems>,
    users: User[],
    playgrounds: Playground[],
    comments: Comment[]
): HomeFeedItem[] {
    const result: HomeFeedItem[] = [];

    for (const item of rawItems) {
        if (item.kind === "diary") {
            const [built] = buildHomeFeedRecords(
                [item.record],
                users,
                playgrounds,
                comments
            );

            if (built) {
                result.push({
                    kind: "diary",
                    sortKey: item.sortKey,
                    feedRecord: built,
                });
            }

            continue;
        }

        const built = buildSystemFeedItem(item.record, users);

        if (built) {
            result.push({
                kind: "system",
                sortKey: item.sortKey,
                feedRecord: built,
            });
        }
    }

    return result;
}
