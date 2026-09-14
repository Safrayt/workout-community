import { Link } from "react-router-dom";

import type { WorkoutEntry } from "../../types/workoutEntry";
import type { Playground } from "../../types/playground";

import { formatWorkoutEntryDate } from "../../utils/formatWorkoutEntryDate";
import { getTimeOfDayName } from "../../utils/timeOfDay";
import { getCardDescriptionPreview } from "../../utils/workoutEntryDescription";

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
 * краткое описание. Теги здесь не показываются — они удлиняли бы
 * плашку в списке; смотреть их можно на странице самой записи. Вся
 * карточка кликабельна — искать маленькую кнопку "Подробнее" не
 * нужно (§25).
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
                    <div className="workout-entry-card__meta-left">
                        <DiaryRecordTypeBadge type="workout" />

                        {
                            entry.isPrivate && (
                                <span className="private-record-badge">
                                    Личное
                                </span>
                            )
                        }
                    </div>

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
                    // Описание показываем только когда нет фото —
                    // если фото есть, в карточке остаётся только
                    // название, чтобы плашки с фото и без фото были
                    // одного размера (высоту описания без фото
                    // ограничивает workout-entry-card__description
                    // в CSS).
                    !mainPhoto && entry.description && (
                        <p className="workout-entry-card__description">
                            {getCardDescriptionPreview(entry.description)}
                        </p>
                    )
                }
            </div>
        </Link>
    );
}
