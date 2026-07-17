import type { Event } from "../types/event";

export function getPlaygroundEvents(
    events: Event[],
    playgroundId: string
) {
    return events.filter(
        (event) =>
            event.playgroundId === playgroundId
    );
}