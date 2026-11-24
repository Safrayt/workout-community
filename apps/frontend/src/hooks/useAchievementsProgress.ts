import { useEffect, useState } from "react";

import { listAchievementsProgress } from "../api/achievements";

import type { AchievementProgress } from "../types/achievementProgress";

type State = {
    /** Для какого пользователя получен этот результат. */
    userId: string;
    progress: AchievementProgress[] | null;
    error: string | null;
};

/**
 * Прогресс по достижениям пользователя userId, как его считает сервер.
 *
 * Хук нужно вызывать до любых ранних return компонента, поэтому userId
 * может быть пустым, а enabled — false (пользователь не найден или
 * достижения скрыты): тогда запрос не отправляется.
 */
export function useAchievementsProgress(
    userId: string | undefined,
    enabled = true
) {
    const [state, setState] = useState<State>({
        userId: "",
        progress: null,
        error: null,
    });

    const requestedUserId = enabled && userId ? userId : "";

    useEffect(() => {
        if (!requestedUserId) {
            return;
        }

        let isCancelled = false;

        listAchievementsProgress(requestedUserId)
            .then((progress) => {
                if (!isCancelled) {
                    setState({
                        userId: requestedUserId,
                        progress,
                        error: null,
                    });
                }
            })
            .catch((error: unknown) => {
                if (!isCancelled) {
                    setState({
                        userId: requestedUserId,
                        progress: null,
                        error:
                            error instanceof Error
                                ? error.message
                                : "Не удалось загрузить достижения.",
                    });
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [requestedUserId]);

    // Ответ, пришедший для другого пользователя (после перехода между
    // профилями), не показываем: пока не загрузился нужный — «загрузка».
    const isCurrent = requestedUserId !== "" && state.userId === requestedUserId;

    return {
        progress: isCurrent ? state.progress : null,
        error: isCurrent ? state.error : null,
        isLoading:
            requestedUserId !== "" &&
            !(isCurrent && (state.progress !== null || state.error !== null)),
    };
}
