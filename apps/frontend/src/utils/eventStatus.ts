type EventLike = {
    startDate: string;
};


export function isUpcomingEvent(
    event: EventLike
) {
    return (
        new Date(event.startDate) >
        new Date()
    );
}


export function isCompletedEvent(
    event: EventLike
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
    event: EventLike
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
