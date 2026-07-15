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