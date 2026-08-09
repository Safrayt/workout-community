import "../../styles/components/playground-activity.css";

import type { Event } from "../../types/event";
import type { WorkoutEntry } from "../../types/workoutEntry";

import {
    getPlaygroundActivityStats,
    PLAYGROUND_ACTIVITY_WINDOW_DAYS,
} from "../../utils/playgroundActivity";

import { pluralizeRu } from "../../utils/pluralize";

import InfoSection from "../ui/InfoSection/InfoSection";

type Props = {
    playgroundId: string;

    events: Event[];

    workoutEntries: WorkoutEntry[];
};

/**
 * "Community History" из документа: показывает, что площадка живая,
 * на примере активности за последние 30 дней. Считаем только то,
 * что реально есть в данных — тренировки из дневника, привязанные
 * к площадке, и уже проведённые (не будущие) мероприятия на ней.
 */
export default function PlaygroundActivity({
    playgroundId,
    events,
    workoutEntries,
}: Props) {
    const {
        workoutsCount,
        eventsCount,
        athletesCount,
    } = getPlaygroundActivityStats(
        playgroundId,
        events,
        workoutEntries,
        PLAYGROUND_ACTIVITY_WINDOW_DAYS
    );

    return (
        <InfoSection
            title={`Активность за последние ${PLAYGROUND_ACTIVITY_WINDOW_DAYS} дней`}
        >
            <div className="playground-activity">
                <div className="playground-activity__row">
                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            {workoutsCount}
                        </span>

                        <span className="playground-activity__label">
                            {
                                pluralizeRu(
                                    workoutsCount,
                                    ["тренировка", "тренировки", "тренировок"]
                                )
                            }
                        </span>
                    </div>

                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            {eventsCount}
                        </span>

                        <span className="playground-activity__label">
                            {
                                pluralizeRu(
                                    eventsCount,
                                    ["мероприятие", "мероприятия", "мероприятий"]
                                )
                            }
                        </span>
                    </div>

                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            {athletesCount}
                        </span>

                        <span className="playground-activity__label">
                            {
                                pluralizeRu(
                                    athletesCount,
                                    ["атлет", "атлета", "атлетов"]
                                )
                            }
                        </span>
                    </div>
                </div>
            </div>
        </InfoSection>
    );
}
