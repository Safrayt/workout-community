import { registrations } from "../data/registrations";

export function getExpectedParticipants(eventId: string) {
    return registrations.filter(
        registration =>
            registration.eventId === eventId &&
            registration.status !== "cancelled"
    ).length;
}