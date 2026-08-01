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

import type {
    AchievementProgress,
} from "../types/achievementProgress";

export function getAchievementsProgress(
    userId: string,

    events: Event[],

    playgrounds: Playground[],

    registrations: EventRegistration[]
): AchievementProgress[] {

    const progressList: AchievementProgress[] = [];

    const createdEvents =
        events.filter(
            (event) =>
                event.creatorId === userId
        );

    const createdPlaygrounds =
        playgrounds.filter(
            (playground) =>
                playground.creatorId === userId
        );

    const userRegistrations =
        registrations.filter(
            (registration) =>
                registration.userId === userId
        );

    const attendedEvents =
        userRegistrations.filter(
            (registration) =>
                registration.status === "attended"
        );

    const statistics = {

        "created-events":
            createdEvents.length,

        "created-playgrounds":
            createdPlaygrounds.length,

        registrations:
            userRegistrations.length,

        "attended-events":
            attendedEvents.length,

    };

    for (const achievement of achievements) {

        const progress =
            statistics[
                achievement.condition as keyof typeof statistics
            ];

        progressList.push({

            achievement,

            progress,

            unlocked:
                progress >=
                achievement.target,

        });

    }

    return progressList;
}