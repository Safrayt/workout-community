import type {
    Achievement,
} from "./achievement";

export type AchievementProgress = {

    achievement: Achievement;

    progress: number;

    unlocked: boolean;

};