import type { Event } from "../types/event";
import type {
    EventDateRangeFilter,
    EventFilterState,
} from "../types/eventFilters";
import { defaultEventFilters } from "../types/eventFilters";

import {
    isUpcomingEvent,
    isCompletedEvent,
} from "./eventStatus";


export function filterEvents(
    events: Event[],
    filters: EventFilterState
) {
    return events.filter(
        (event) => matchesFilters(event, filters)
    );
}

/**
 * Количество активных пунктов для бейджа "Фильтры · N" (UX §23).
 * Статус считается активным, только если он отличается от дефолтного
 * "Предстоящие" — иначе счётчик был бы всегда минимум 1.
 */
export function hasActiveEventFilters(
    filters: EventFilterState
) {
    return (
        filters.dateRange !== defaultEventFilters.dateRange ||
        filters.status !== defaultEventFilters.status
    );
}
export function countActiveEventFilters(
    filters: EventFilterState
) {
    let count = 0;

    if (filters.dateRange !== defaultEventFilters.dateRange) {
        count += 1;
    }

    if (filters.status !== defaultEventFilters.status) {
        count += 1;
    }

    return count;
}

function matchesFilters(
    event: Event,
    filters: EventFilterState
) {
    if (
        filters.status === "upcoming" &&
        !isUpcomingEvent(event)
    ) {
        return false;
    }

    if (
        filters.status === "completed" &&
        !isCompletedEvent(event)
    ) {
        return false;
    }

    if (
        filters.dateRange !== "all" &&
        !matchesDateRange(event, filters.dateRange)
    ) {
        return false;
    }

    return true;
}

function startOfDay(date: Date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );
}

/** Понедельник недели, в которую попадает `date` (ISO, неделя с пн). */
function startOfWeek(date: Date) {
    const start = startOfDay(date);

    // getDay(): 0 — воскресенье, 1 — понедельник, ... 6 — суббота.
    const dayIndex = (start.getDay() + 6) % 7;

    start.setDate(start.getDate() - dayIndex);

    return start;
}

function startOfMonth(date: Date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        1
    );
}

function addDays(date: Date, days: number) {
    const result = new Date(date);

    result.setDate(result.getDate() + days);

    return result;
}

function matchesDateRange(
    event: Event,
    range: EventDateRangeFilter
) {
    const eventDate = new Date(event.startDate);
    const now = new Date();

    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);

    switch (range) {
        case "today":
            return (
                eventDate >= today &&
                eventDate < tomorrow
            );

        case "tomorrow": {
            const dayAfterTomorrow = addDays(tomorrow, 1);

            return (
                eventDate >= tomorrow &&
                eventDate < dayAfterTomorrow
            );
        }

        case "week": {
            const weekStart = startOfWeek(today);
            const weekEnd = addDays(weekStart, 7);

            return (
                eventDate >= today &&
                eventDate < weekEnd
            );
        }

        case "month": {
            const monthStart = startOfMonth(today);
            const monthEnd = startOfMonth(
                addDays(monthStart, 32)
            );

            return (
                eventDate >= today &&
                eventDate < monthEnd
            );
        }

        default:
            return true;
    }
}
