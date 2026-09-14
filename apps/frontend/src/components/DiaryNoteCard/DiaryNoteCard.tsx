import { Link } from "react-router-dom";

import type { DiaryNote } from "../../types/diaryNote";
import type { Playground } from "../../types/playground";

import { formatWorkoutEntryDate } from "../../utils/formatWorkoutEntryDate";
import { getCardDescriptionPreview } from "../../utils/workoutEntryDescription";

import DiaryRecordTypeBadge from "../DiaryRecordTypeBadge/DiaryRecordTypeBadge";

import "../../styles/components/workout-entry-card.css";

type DiaryNoteCardProps = {
    note: DiaryNote;
    playground?: Playground;
};

/**
 * Карточка заметки в списке дневника. Использует ту же вёрстку и
 * приоритет полей, что и WorkoutEntryCard — тренировки и заметки
 * должны отличаться, но не слишком резко (UX-DIARY-V2 §9). Теги
 * здесь не показываются — смотреть их можно на странице самой
 * заметки.
 *
 * Если заголовка нет — используется начало текста (§5 "В списках и
 * превью в таком случае могут использоваться первые строки текста").
 */
export default function DiaryNoteCard({
    note,
    playground,
}: DiaryNoteCardProps) {
    const mainPhoto =
        note.photos?.find((photo) => photo.isMain) ??
        note.photos?.[0];

    const heading =
        note.title ?? getCardDescriptionPreview(note.text, 60);

    return (
        <Link
            to={`/diary/notes/${note.id}`}
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
                        <DiaryRecordTypeBadge type="note" />

                        {
                            note.isPrivate && (
                                <span className="private-record-badge">
                                    Личное
                                </span>
                            )
                        }
                    </div>

                    <p className="workout-entry-card__date">
                        {formatWorkoutEntryDate(note.date)}
                    </p>
                </div>

                <h4 className="workout-entry-card__title">
                    {heading}
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
                    // название (см. аналогичную логику в
                    // WorkoutEntryCard).
                    !mainPhoto && note.title && (
                        <p className="workout-entry-card__description">
                            {getCardDescriptionPreview(note.text)}
                        </p>
                    )
                }
            </div>
        </Link>
    );
}
