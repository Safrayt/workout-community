import type {
    Achievement,
} from "./achievement";

export type UserAchievement = {

    achievement: Achievement;

    unlocked: boolean;

    progress: number;

    unlockedAt?: string;

};