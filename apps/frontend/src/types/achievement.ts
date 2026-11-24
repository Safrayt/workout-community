export type AchievementCategory =
    | "community"
    | "events"
    | "playgrounds"
    | "training"
    | "collection";

export type AchievementRarity =
    | "common"
    | "rare"
    | "epic"
    | "legendary";

export type AchievementCondition =
    | "created-events"
    | "created-playgrounds"
    | "registrations"
    | "attended-events"
    | "workouts-at-minus-10"
    | "workouts-at-minus-20"
    | "workouts-with-program"
    | "workouts-on-one-playground";

export type Achievement = {

    id: string;

    title: string;

    description: string;

    icon: string;

    image?: string;

    category: AchievementCategory;

    rarity: AchievementRarity;

    condition: AchievementCondition;

    target: number;

};