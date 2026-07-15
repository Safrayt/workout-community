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