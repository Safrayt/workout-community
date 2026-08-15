import { Link } from "react-router-dom";

import type { WorkoutEntry } from "../../types/workoutEntry";
import type { Playground } from "../../types/playground";

import { formatWorkoutEntryDate } from "../../utils/formatWorkoutEntryDate";
import { getTimeOfDayName } from "../../utils/timeOfDay";
import { getCardDescriptionPreview } from "../../utils/workoutEntryDescription";

import TagBadge from "../ui/TagBadge/TagBadge";
import DiaryRecordTypeBadge from "../DiaryRecordTypeBadge/DiaryRecordTypeBadge";

import "../../styles/components/workout-entry-card.css";

type WorkoutEntryCardProps = {
    entry: WorkoutEntry;
    playground?: Playground;
};

/**
 * Карточка записи-тренировки в списке дневника (UX-DIARY §22–26;
 * UX-DIARY-V2 §9 — визуальный маркер типа записи).
 *
 * Приоритет информации: фото → тип+дата → название → площадка →
 * краткое описание → теги. Вся карточка кликабельна — искать
 * маленькую кнопку "Подробнее" не нужно (§25).
 */
export default function WorkoutEntryCard({
    entry,
    playground,
}: WorkoutEntryCardProps) {
    // Миниатюра записи — главная фотография, выбранная пользователем
    // в форме, либо первая загруженная, если главная не отмечена
    // явно (§23). Если фото нет вовсе — просто нет картинки, а не
    // сломанный вид (§24).
    const mainPhoto =
        entry.photos?.find((photo) => photo.isMain) ??
        entry.photos?.[0];

    return (
        <Link
            to={`/diary/${entry.id}`}
            className="workout-entry-card"
        >
            {
                mainPhoto && (
                    <img
                        src={mainPhoto.url}
                        alt=""
                        className="workout-entry-card__photo"
                    />
                )
            }

            <div className="workout-entry-card__body">
                <div className="workout-entry-card__meta">
                    <DiaryRecordTypeBadge type="workout" />

                    <p className="workout-entry-card__date">
                        {formatWorkoutEntryDate(entry.date)}
                        {
                            entry.timeOfDay &&
                                ` • ${getTimeOfDayName(entry.timeOfDay)}`
                        }
                    </p>
                </div>

                <h4 className="workout-entry-card__title">
                    {entry.title}
                </h4>

                {
                    playground && (
                        <p className="workout-entry-card__playground">
                            {playground.name}
                        </p>
                    )
                }

                {
                    entry.description && (
                        <p className="workout-entry-card__description">
                            {getCardDescriptionPreview(entry.description)}
                        </p>
                    )
                }

                {
                    entry.tags && entry.tags.length > 0 && (
                        <div className="tag-list">
                            {
                                entry.tags.map(
                                    (tag) => (
                                        <TagBadge
                                            key={tag}
                                            label={tag}
                                        />
                                    )
                                )
                            }
                        </div>
                    )
                }
            </div>
        </Link>
    );
}
