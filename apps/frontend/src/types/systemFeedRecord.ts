import type { Event } from "./event";
import type { Playground } from "./playground";

export type SystemFeedRecordType = "event_created" | "playground_created";

/**
 * Системная запись в общей ленте Главной — в отличие от
 * HomeFeedRecord (запись дневника пользователя), это не действие
 * пользователя "я потренировался", а автоматическое оповещение
 * сообщества о значимом событии в жизни портала: создано новое
 * мероприятие или добавлена новая площадка.
 *
 * Показывается только в ленте (HomeFeed). На карте активности
 * (HomeActivityMap) не отображается никогда — карта работает только
 * с DiaryRecord и отвечает на вопрос "где сообщество тренировалось",
 * а не "что вообще произошло в сообществе".
 */
export type SystemFeedRecord =
    | { type: "event_created"; createdAt: string; data: Event }
    | { type: "playground_created"; createdAt: string; data: Playground };
