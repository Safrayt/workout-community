import type { DiaryRecord } from "../types/diaryRecord";
import type { User } from "../types/user";
import type { HomeActivityMarker } from "../types/homeActivityMarker";

import { isWithinLastHours } from "./date";
import { HOME_ACTIVITY_WINDOW_HOURS } from "../constants/home";

/**
 * Публичные записи, опубликованные за последние 24 часа (скользящее
 * окно по createdAt). Приватный дневник (diaryVisible === false) не
 * должен раскрывать факт активности пользователя на площадке
 * (UX-HOME §6, §15).
 */
export function getRecentPublicRecords(
    records: DiaryRecord[],
    users: User[]
): DiaryRecord[] {
    return records.filter((record) => {
        const author = users.find(
            (user) => user.id === record.data.userId
        );

        if (!author || !author.privacySettings.diaryVisible) {
            return false;
        }

        return isWithinLastHours(
            record.createdAt,
            HOME_ACTIVITY_WINDOW_HOURS
        );
    });
}

/**
 * Агрегирует недавние публичные записи по площадке — для одной
 * площадки одна метка, workout имеет приоритет над note при выборе
 * цвета (UX-HOME §7, §8). Записи без playgroundId на карту не
 * попадают — им нечего показывать.
 */
export function getActivityMarkers(
    recentPublicRecords: DiaryRecord[]
): HomeActivityMarker[] {
    const markersByPlayground = new Map<string, HomeActivityMarker>();

    for (const record of recentPublicRecords) {
        const playgroundId = record.data.playgroundId;

        if (!playgroundId) {
            continue;
        }

        const existing = markersByPlayground.get(playgroundId) ?? {
            playgroundId,
            hasWorkout: false,
            hasNote: false,
            workoutCount: 0,
            noteCount: 0,
            lastActivityAt: record.createdAt,
        };

        if (record.type === "workout") {
            existing.hasWorkout = true;
            existing.workoutCount += 1;
        } else {
            existing.hasNote = true;
            existing.noteCount += 1;
        }

        if (record.createdAt.localeCompare(existing.lastActivityAt) > 0) {
            existing.lastActivityAt = record.createdAt;
        }

        markersByPlayground.set(playgroundId, existing);
    }

    return Array.from(markersByPlayground.values());
}
