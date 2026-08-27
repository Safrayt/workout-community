import type {
    EventRegistration,
} from "../types/eventRegistration";

import type {
    Event,
} from "../types/event";

import { isCompletedEvent } from "./eventStatus";

export function getEventRegistrations(
    registrations: EventRegistration[],
    eventId: string
) {
    return registrations.filter(
        (registration) =>
            registration.eventId === eventId &&
            registration.status === "registered"
    );
}

/**
 * Сколько мероприятий пользователь посетил: заявился (status —
 * "registered", не отменённая регистрация) на мероприятие, которое
 * уже прошло — метрика "Событий посещено" в статистике профиля.
 */
export function getAttendedEventsCount(
    registrations: EventRegistration[],
    events: Event[],
    userId: string
) {
    const eventById = new Map(
        events.map((event) => [event.id, event])
    );

    return registrations.filter((registration) => {
        if (
            registration.userId !== userId ||
            registration.status !== "registered"
        ) {
            return false;
        }

        const event = eventById.get(registration.eventId);

        return event !== undefined && isCompletedEvent(event);
    }).length;
}