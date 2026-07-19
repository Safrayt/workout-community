import type { Event } from "../types/event";

export function getEventsCount(
    events: Event[],
    playgroundId: string
) {
    return events.filter(
        (event) =>
            event.playgroundId === playgroundId
    ).length;
}