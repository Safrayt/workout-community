import type { Event } from "../types/event";


export function isUpcomingEvent(
    event: Event
) {
    return (
        new Date(event.startDate) >
        new Date()
    );
}


export function isCompletedEvent(
    event: Event
) {
    return (
        new Date(event.startDate) <
        new Date()
    );
}

export type EventStatus =
    | "upcoming"
    | "completed";

export function getEventStatus(
    event: Event
): EventStatus {
    return isCompletedEvent(event)
        ? "completed"
        : "upcoming";
}

export const eventStatusLabels: Record<
    EventStatus,
    string
> = {
    upcoming: "Предстоит",
    completed: "Завершено",
};