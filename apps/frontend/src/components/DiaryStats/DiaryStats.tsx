import type { WorkoutEntry } from "../../types/workoutEntry";

import { pluralizeRu } from "../../utils/pluralize";

import "../../styles/components/diary-stats.css";

type DiaryStatsProps = {

    entries: WorkoutEntry[];

};

/**
 * Небольшая статистика в Hero-блоке (UX-DIARY §5). Намеренно
 * второстепенная и компактная — главная функция страницы не
 * аналитика, а просмотр истории.
 */
export default function DiaryStats({
    entries,
}: DiaryStatsProps) {
    if (entries.length === 0) {
        return null;
    }

    const playgroundsCount = new Set(
        entries
            .map((entry) => entry.playgroundId)
            .filter(Boolean)
    ).size;

    const daysCount = new Set(
        entries.map((entry) => entry.date)
    ).size;

    return (
        <div className="diary-stats">
            <div className="diary-stats__item">
                <span className="diary-stats__value">
                    {entries.length}
                </span>

                <span className="diary-stats__label">
                    {
                        pluralizeRu(
                            entries.length,
                            ["тренировка", "тренировки", "тренировок"]
                        )
                    }
                </span>
            </div>

            {
                playgroundsCount > 0 && (
                    <div className="diary-stats__item">
                        <span className="diary-stats__value">
                            {playgroundsCount}
                        </span>

                        <span className="diary-stats__label">
                            {
                                pluralizeRu(
                                    playgroundsCount,
                                    ["площадка", "площадки", "площадок"]
                                )
                            }
                        </span>
                    </div>
                )
            }

            <div className="diary-stats__item">
                <span className="diary-stats__value">
                    {daysCount}
                </span>

                <span className="diary-stats__label">
                    {
                        pluralizeRu(
                            daysCount,
                            ["день", "дня", "дней"]
                        )
                    }
                </span>
            </div>
        </div>
    );
}
