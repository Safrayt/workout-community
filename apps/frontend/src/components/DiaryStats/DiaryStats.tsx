import type { WorkoutEntry } from "../../types/workoutEntry";
import type { DiaryNote } from "../../types/diaryNote";

import { pluralizeRu } from "../../utils/pluralize";

import "../../styles/components/diary-stats.css";

type DiaryStatsProps = {

    entries: WorkoutEntry[];

    notes: DiaryNote[];

};

/**
 * Небольшая статистика в Hero-блоке (UX-DIARY §5). Намеренно
 * второстепенная и компактная — главная функция страницы не
 * аналитика, а просмотр истории. Оформление — как у "profile-stats"
 * на странице профиля, для единообразия карточек-статистик по
 * всему приложению.
 */
export default function DiaryStats({
    entries,
    notes,
}: DiaryStatsProps) {
    if (entries.length === 0 && notes.length === 0) {
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

    const notesCount = notes.length;

    return (
        <div className="diary-stats">
            <div className="diary-stats__item">
                <span className="diary-stats__label">
                    Тренировок записано
                </span>

                <span className="diary-stats__value">
                    {entries.length}
                </span>
            </div>

            <div className="diary-stats__item">
                <span className="diary-stats__label">
                    {
                        pluralizeRu(
                            daysCount,
                            ["тренировочный день", "тренировочных дня", "тренировочных дней"]
                        )
                    }
                </span>

                <span className="diary-stats__value">
                    {daysCount}
                </span>
            </div>

            {
                playgroundsCount > 0 && (
                    <div className="diary-stats__item">
                        <span className="diary-stats__label">
                            Площадок использовано
                        </span>

                        <span className="diary-stats__value">
                            {playgroundsCount}
                        </span>
                    </div>
                )
            }

            {
                notesCount > 0 && (
                    <div className="diary-stats__item">
                        <span className="diary-stats__label">
                            Заметок записано
                        </span>

                        <span className="diary-stats__value">
                            {notesCount}
                        </span>
                    </div>
                )
            }
        </div>
    );
}
