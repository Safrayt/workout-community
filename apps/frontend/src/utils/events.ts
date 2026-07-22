import type { Event } from "../types/event";
import type { EventRegistration } from "../types/eventRegistration";


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
    return events.find(
        (event) =>
            event.id === id
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