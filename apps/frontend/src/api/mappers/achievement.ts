import type {
    Achievement,
    AchievementCategory,
    AchievementCondition,
    AchievementRarity,
} from "../../types/achievement";
import type { AchievementProgress } from "../../types/achievementProgress";

export type ApiAchievement = {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: AchievementCategory;
    rarity: AchievementRarity;
    condition: AchievementCondition;
    target: number;
};

export type ApiAchievementProgress = {
    achievement: ApiAchievement;
    progress: number;
    unlocked: boolean;
};

export function mapApiAchievementProgress(
    apiProgress: ApiAchievementProgress
): AchievementProgress {
    const achievement: Achievement = {
        id: apiProgress.achievement.id,
        title: apiProgress.achievement.title,
        description: apiProgress.achievement.description,
        icon: apiProgress.achievement.icon,
        category: apiProgress.achievement.category,
        rarity: apiProgress.achievement.rarity,
        condition: apiProgress.achievement.condition,
        target: apiProgress.achievement.target,
    };

    return {
        achievement,
        progress: apiProgress.progress,
        unlocked: apiProgress.unlocked,
    };
}
