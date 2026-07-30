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
    | "attended-events";

export type Achievement = {

    id: string;

    title: string;

    description: string;

    icon: string;

    image?: string;

    category: AchievementCategory;

    rarity: AchievementRarity;

    experience: number;

    condition: AchievementCondition;

    target: number;

};