import type { EventRegistration } from "../types/eventRegistration";

export function getExpectedParticipants(
    registrations: EventRegistration[],
    eventId: string
) {
    return registrations.filter(
        registration =>
            registration.eventId === eventId &&
            registration.status !== "cancelled"
    ).length;
}

export function isUserRegistered(
    registrations: EventRegistration[],
    userId: string,
    eventId: string
) {
    return registrations.some(
        (registration) =>
            registration.userId === userId &&
            registration.eventId === eventId &&
            registration.status === "registered"
    );
}
