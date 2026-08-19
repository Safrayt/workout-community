import { useEffect, useState } from "react";

import type { DiaryRecord } from "../../types/diaryRecord";
import type { Playground } from "../../types/playground";
import type { User } from "../../types/user";

import PlaygroundsMap from "../Map/PlaygroundsMap";
import ActivityMapLegend from "../ActivityMapLegend/ActivityMapLegend";
import Button from "../ui/Button/Button";

import {
    getRecentPublicRecords,
    getActivityMarkers,
} from "../../utils/homeActivity";

import { getPlaygroundById } from "../../utils/playgrounds";
import { formatTimeAgo } from "../../utils/timeAgo";
import { pluralizeRu } from "../../utils/pluralize";
import { useSimulatedLoad } from "../../hooks/useSimulatedLoad";

import {
    HOME_ACTIVITY_MAP_COLLAPSED_KEY,
    HOME_ACTIVITY_MARKER_COLORS,
} from "../../constants/home";

import "../../styles/components/home-activity-map.css";

type HomeActivityMapProps = {
    records: DiaryRecord[];
    playgrounds: Playground[];
    users: User[];
};

/**
 * "Активность на площадках" (UX-HOME §4–11): отвечает на вопрос "где
 * сейчас появляется свежая активность сообщества?" — в отличие от
 * DiaryMap ("где тренировался я?"). Строится поверх общего
 * PlaygroundsMap, но со своей бизнес-логикой (UX-HOME §31).
 */
export default function HomeActivityMap({
    records,
    playgrounds,
    users,
}: HomeActivityMapProps) {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return (
                localStorage.getItem(
                    HOME_ACTIVITY_MAP_COLLAPSED_KEY
                ) === "true"
            );
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(
                HOME_ACTIVITY_MAP_COLLAPSED_KEY,
                String(isCollapsed)
            );
        } catch {
            // localStorage может быть недоступен (приватный режим) —
            // сворачивание просто не сохранится между визитами.
        }
    }, [isCollapsed]);

    const recentPublicRecords = getRecentPublicRecords(records, users);
    const activityMarkers = getActivityMarkers(recentPublicRecords);

    const { status, retry } = useSimulatedLoad();

    const mapMarkers = activityMarkers
        .map((marker) => {
            const playground = getPlaygroundById(
                playgrounds,
                marker.playgroundId
            );

            if (!playground) {
                return undefined;
            }

            const statParts: string[] = [];

            if (marker.workoutCount > 0) {
                statParts.push(
                    `🟢 ${marker.workoutCount} ${pluralizeRu(
                        marker.workoutCount,
                        ["тренировка", "тренировки", "тренировок"]
                    )}`
                );
            }

            if (marker.noteCount > 0) {
                statParts.push(
                    `🟡 ${marker.noteCount} ${pluralizeRu(
                        marker.noteCount,
                        ["заметка", "заметки", "заметок"]
                    )}`
                );
            }

            return {
                id: playground.id,
                title: playground.name,
                latitude: playground.coordinates.latitude,
                longitude: playground.coordinates.longitude,
                url: `/playgrounds/${playground.id}`,
                locality: `Последняя публикация: ${formatTimeAgo(marker.lastActivityAt)}`,
                shortInfo: statParts.join(" · "),
                color: marker.hasWorkout
                    ? HOME_ACTIVITY_MARKER_COLORS.workout
                    : HOME_ACTIVITY_MARKER_COLORS.note,
            };
        })
        .filter((marker): marker is NonNullable<typeof marker> =>
            Boolean(marker)
        );

    return (
        <section className="home-activity-map">
            <button
                type="button"
                className="home-activity-map__header"
                onClick={() => setIsCollapsed((current) => !current)}
                aria-expanded={!isCollapsed}
            >
                <span className="home-activity-map__heading">
                    <span className="home-activity-map__title">
                        Активность на площадках
                    </span>

                    <span className="home-activity-map__subtitle">
                        Тренировки и заметки, опубликованные за последние 24 часа
                    </span>
                </span>

                <span
                    className="home-activity-map__chevron"
                    data-open={!isCollapsed}
                    aria-hidden="true"
                />
            </button>

            {
                !isCollapsed && (
                    <div className="home-activity-map__body">
                        <ActivityMapLegend />

                        {
                            status === "error" ? (
                                <div className="home-activity-map__error">
                                    <p>Не удалось загрузить карту</p>

                                    <Button onClick={retry}>Повторить</Button>
                                </div>
                            ) : status === "loading" ? (
                                <div
                                    className="home-activity-map__skeleton"
                                    style={{ height: "var(--home-activity-map-height, 440px)" }}
                                    aria-hidden="true"
                                />
                            ) : mapMarkers.length === 0 ? (
                                <p className="home-activity-map__empty">
                                    За последние 24 часа новых записей на площадках не было.
                                </p>
                            ) : (
                                <PlaygroundsMap
                                    markers={mapMarkers}
                                    height="var(--home-activity-map-height, 440px)"
                                    detailsLinkLabel="Открыть площадку"
                                />
                            )
                        }
                    </div>
                )
            }
        </section>
    );
}
