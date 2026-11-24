import { apiFetch, buildQuery } from "./client";
import {
    mapApiAchievementProgress,
    type ApiAchievementProgress,
} from "./mappers/achievement";

import type { AchievementProgress } from "../types/achievementProgress";

/**
 * Прогресс пользователя по всем достижениям. Считает сервер — он видит
 * записи дневника, площадки и регистрации любого пользователя, а
 * клиенту чужие записи дневника недоступны. Если пользователь закрыл
 * достижения от посторонних, сервер ответит 403.
 */
export async function listAchievementsProgress(
    userId: string
): Promise<AchievementProgress[]> {
    const apiProgress = await apiFetch<ApiAchievementProgress[]>(
        `/achievements/progress${buildQuery({ user_id: userId })}`
    );

    return apiProgress.map(mapApiAchievementProgress);
}
