import type { Event } from "../types/event";
import type { EventRegistration } from "../types/eventRegistration";
import { findById } from "./collections";
import { isUpcomingEvent } from "./eventStatus";


export function getUserEvents(
    events: Event[],
    registrations: EventRegistration[],
    userId: string
) {
    const userEventIds = registrations
        .filter(
            (registration) =>
                registration.userId === userId &&
                registration.status === "registered"
        )
        .map(
            (registration) =>
                registration.eventId
        );


    return events.filter(
        (event) =>
            userEventIds.includes(event.id)
    );
}

export function getEventById(
    events: Event[],
    id: string
) {
    return findById(
        events,
        id
    );
}


export function getRegisteredParticipantsCount(
    registrations: EventRegistration[],
    eventId: string
) {
    return registrations.filter(
        (registration) =>
            registration.eventId === eventId &&
            registration.status === "registered"
    ).length;
}

export function getCreatedEvents(
    events: Event[],
    userId: string
) {
    return events.filter(
        (event) =>
            event.creatorId === userId
    );
}

/** События по дате начала: раньше — раньше в списке. */
export function sortEventsAscending(
    events: Event[]
) {
    return [...events].sort(
        (a, b) =>
            new Date(a.startDate).getTime() -
            new Date(b.startDate).getTime()
    );
}

/** События по дате начала: позже — раньше в списке. */
export function sortEventsDescending(
    events: Event[]
) {
    return [...events].sort(
        (a, b) =>
            new Date(b.startDate).getTime() -
            new Date(a.startDate).getTime()
    );
}

/**
 * Ближайшие предстоящие события для блока "Ближайшие события"
 * (UX §7) — верхние `limit` штук, отсортированные по дате.
 */
export function getUpcomingEventsPreview(
    events: Event[],
    limit = 3
) {
    return sortEventsAscending(
        events.filter(isUpcomingEvent)
    ).slice(0, limit);
}