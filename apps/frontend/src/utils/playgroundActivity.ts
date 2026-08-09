import type { Event } from "../types/event";
import type { WorkoutEntry } from "../types/workoutEntry";
import type { PlaygroundFavorite } from "../types/favorite";

import { isCompletedEvent } from "./eventStatus";
import { isWithinLastDays } from "./date";

export const PLAYGROUND_ACTIVITY_WINDOW_DAYS = 30;

export type PlaygroundActivityStats = {
    workoutsCount: number;
    eventsCount: number;
    athletesCount: number;
};

export type PlaygroundAllTimeActivityStats =
    PlaygroundActivityStats & {
        subscribersCount: number;
    };

/**
 * Считает статистику активности площадки за последние windowDays
 * суток (по умолчанию — 30):
 * - workoutsCount — сколько раз площадку отмечали в дневнике тренировок
 * - eventsCount — сколько проведённых (уже состоявшихся) мероприятий
 *   прошло на этой площадке
 * - athletesCount — сколько разных пользователей отмечали тренировки
 *   на этой площадке (уникальные userId)
 *
 * Если windowDays не передан — считает за всё время, без фильтра по дате.
 *
 * events и workoutEntries можно передавать как полный список —
 * функция сама отфильтрует по playgroundId.
 */
export function getPlaygroundActivityStats(
    playgroundId: string,
    events: Event[],
    workoutEntries: WorkoutEntry[],
    windowDays?: number
): PlaygroundActivityStats {
    const playgroundEntries = workoutEntries.filter(
        (entry) =>
            entry.playgroundId === playgroundId &&
            (
                windowDays === undefined ||
                isWithinLastDays(entry.date, windowDays)
            )
    );

    const completedPlaygroundEvents = events.filter(
        (event) =>
            event.playgroundId === playgroundId &&
            isCompletedEvent(event) &&
            (
                windowDays === undefined ||
                isWithinLastDays(event.startDate, windowDays)
            )
    );

    const uniqueAthleteIds = new Set(
        playgroundEntries.map(
            (entry) => entry.userId
        )
    );

    return {
        workoutsCount: playgroundEntries.length,
        eventsCount: completedPlaygroundEvents.length,
        athletesCount: uniqueAthleteIds.size,
    };
}

/**
 * Статистика "Активность за всё время": те же три метрики без
 * ограничения по дате, плюс subscribersCount — сколько пользователей
 * добавили площадку в избранное.
 */
export function getPlaygroundAllTimeActivityStats(
    playgroundId: string,
    events: Event[],
    workoutEntries: WorkoutEntry[],
    favorites: PlaygroundFavorite[]
): PlaygroundAllTimeActivityStats {
    const allTimeStats = getPlaygroundActivityStats(
        playgroundId,
        events,
        workoutEntries
    );

    const subscribersCount = favorites.filter(
        (favorite) => favorite.playgroundId === playgroundId
    ).length;

    return {
        ...allTimeStats,
        subscribersCount,
    };
}
