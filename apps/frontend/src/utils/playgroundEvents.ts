import type { Event } from "../types/event";

import { isUpcomingEvent } from "./eventStatus";

export function getPlaygroundEvents(
    events: Event[],
    playgroundId: string
) {
    return events.filter(
        (event) =>
            event.playgroundId === playgroundId
    );
}

/**
 * Ближайшее предстоящее мероприятие на площадке — для карточки
 * в каталоге (раздел 23 UX-спеки: "ближайшее событие, если есть").
 * Возвращает undefined, если предстоящих мероприятий нет.
 */
export function getNearestUpcomingEvent(
    events: Event[],
    playgroundId: string
): Event | undefined {
    return getPlaygroundEvents(events, playgroundId)
        .filter(isUpcomingEvent)
        .sort(
            (a, b) =>
                new Date(a.startDate).getTime() -
                new Date(b.startDate).getTime()
        )[0];
}

/**
 * Ближайшие события сразу для набора площадок, одним проходом по
 * events вместо N обращений к getPlaygroundEvents на каждую карточку
 * списка.
 */
export function getNearestUpcomingEventsByPlayground(
    events: Event[]
): Record<string, Event> {
    const result: Record<string, Event> = {};

    for (const event of events) {
        if (!isUpcomingEvent(event)) {
            continue;
        }

        const current = result[event.playgroundId];

        if (
            !current ||
            new Date(event.startDate).getTime() <
                new Date(current.startDate).getTime()
        ) {
            result[event.playgroundId] = event;
        }
    }

    return result;
}