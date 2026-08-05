import type { Event } from "../types/event";
import type { NewEvent } from "../types/newEvent";

export function eventToFormValue(
    event: Event
): NewEvent {
    return {
        title: event.title,

        description: event.description,

        playgroundId: event.playgroundId,

        startDate: event.startDate,

        posterUrl: event.posterUrl ?? "",
    };
}