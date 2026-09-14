import type { DiaryRecord } from "./diaryRecord";
import type { User } from "./user";
import type { Playground } from "./playground";
import type { SystemFeedRecord } from "./systemFeedRecord";

/** Переключатель вкладок ленты Главной (UX-HOME §12–14). "admin" —
 *  видна только администратору, показывает вообще все записи,
 *  включая скрытые приватностью (см. HomeFeedTabs/HomeFeed). */
export type HomeFeedMode = "all" | "following" | "admin";

/**
 * View-модель записи в ленте Главной (UX-HOME §33). Отделяет
 * данные дневника от представления социальной ленты — Главная не
 * заводит отдельную сущность FeedPost (UX-HOME §30, §19 в §37).
 */
export type HomeFeedRecord = {
    record: DiaryRecord;

    author: User;

    playground?: Playground;

    commentsCount: number;
};

/**
 * View-модель системной записи в ленте (создано мероприятие /
 * площадка) — тот же принцип, что HomeFeedRecord, но без площадки и
 * комментариев: система таких данных для этих записей не хранит.
 */
export type SystemFeedItem = {
    record: SystemFeedRecord;

    author: User;
};

/**
 * Единица списка ленты Главной — либо запись дневника пользователя,
 * либо системная запись. Обе сортируются и листаются вместе по
 * времени создания, но рендерятся разными карточками
 * (HomeFeedCard / SystemFeedCard).
 */
export type HomeFeedItem =
    | { kind: "diary"; sortKey: string; feedRecord: HomeFeedRecord }
    | { kind: "system"; sortKey: string; feedRecord: SystemFeedItem };
