import type { Event } from "../types/event";

export function getNextPlaygroundEvent(
    events: Event[],
    playgroundId: string
) {
    const upcomingEvents = events
        .filter(
            (event) => event.playgroundId === playgroundId
        )
        .sort(
            (a, b) =>
                new Date(a.startDate).getTime() -
                new Date(b.startDate).getTime()
        );

    return upcomingEvents[0];
}