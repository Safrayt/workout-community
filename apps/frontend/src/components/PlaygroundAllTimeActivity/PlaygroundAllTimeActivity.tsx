import "../../styles/components/playground-activity.css";

import type { Event } from "../../types/event";
import type { WorkoutEntry } from "../../types/workoutEntry";
import type { PlaygroundFavorite } from "../../types/favorite";

import { getPlaygroundAllTimeActivityStats } from "../../utils/playgroundActivity";

import InfoSection from "../ui/InfoSection/InfoSection";

type Props = {
    playgroundId: string;

    events: Event[];

    workoutEntries: WorkoutEntry[];

    favorites: PlaygroundFavorite[];
};

/**
 * "Активность за всё время" — те же тренировки/мероприятия/атлеты,
 * что и в блоке за 30 дней, но без ограничения по дате, плюс
 * подписчики (пользователи, добавившие площадку в избранное).
 * Подписи здесь — фиксированные названия категорий (как "Подписчики"
 * в соцсетях), а не согласованные с числом фразы.
 */
export default function PlaygroundAllTimeActivity({
    playgroundId,
    events,
    workoutEntries,
    favorites,
}: Props) {
    const {
        workoutsCount,
        eventsCount,
        athletesCount,
        subscribersCount,
    } = getPlaygroundAllTimeActivityStats(
        playgroundId,
        events,
        workoutEntries,
        favorites
    );

    return (
        <InfoSection title="Активность за всё время">
            <div className="playground-activity">
                <div className="playground-activity__row playground-activity__row--four">
                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            {workoutsCount}
                        </span>

                        <span className="playground-activity__label">
                            Тренировок
                        </span>
                    </div>

                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            {eventsCount}
                        </span>

                        <span className="playground-activity__label">
                            Мероприятий
                        </span>
                    </div>

                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            {athletesCount}
                        </span>

                        <span className="playground-activity__label">
                            Атлетов
                        </span>
                    </div>

                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            {subscribersCount}
                        </span>

                        <span className="playground-activity__label">
                            Подписчиков
                        </span>
                    </div>
                </div>
            </div>
        </InfoSection>
    );
}
