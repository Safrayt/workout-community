import type { DiaryRecord } from "./diaryRecord";
import type { User } from "./user";
import type { Playground } from "./playground";

/** Переключатель вкладок ленты Главной (UX-HOME §12–14). */
export type HomeFeedMode = "all" | "following";

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
