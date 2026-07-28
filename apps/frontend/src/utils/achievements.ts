import type {
    Achievement,
} from "../types/achievement";

import type {
    Event,
} from "../types/event";

import type {
    Playground,
} from "../types/playground";

import type {
    EventRegistration,
} from "../types/eventRegistration";

import {
    achievements,
} from "../data/achievements";

export function getUnlockedAchievements(
    userId: string,

    events: Event[],

    playgrounds: Playground[],

    registrations: EventRegistration[]
): Achievement[] {

    const unlocked: Achievement[] = [];

    const createdEvents =
        events.filter(
            (event) =>
                event.creatorId === userId
        );

    if (createdEvents.length > 0) {

        unlocked.push(
            achievements.find(
                (item) =>
                    item.id === "first-event"
            )!
        );

    }

    return unlocked;
}