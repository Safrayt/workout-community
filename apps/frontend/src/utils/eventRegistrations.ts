import type {
    EventRegistration,
} from "../types/eventRegistration";

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