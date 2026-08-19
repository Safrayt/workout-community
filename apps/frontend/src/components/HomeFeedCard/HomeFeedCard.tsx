import { useNavigate, Link } from "react-router-dom";
import type { MouseEvent } from "react";

import type { HomeFeedRecord } from "../../types/homeFeedRecord";

import Avatar from "../ui/Avatar/Avatar";
import DiaryRecordTypeBadge from "../DiaryRecordTypeBadge/DiaryRecordTypeBadge";
import TagBadge from "../ui/TagBadge/TagBadge";

import {
    formatTimeAgo,
    formatAddedLabel,
    isActivityDateDivergent,
} from "../../utils/timeAgo";
import { formatWorkoutEntryDate } from "../../utils/formatWorkoutEntryDate";
import { getTimeOfDayName } from "../../utils/timeOfDay";
import { getCardDescriptionPreview } from "../../utils/workoutEntryDescription";
import { getDiaryRecordUrl } from "../../utils/diaryRecords";

import "../../styles/components/workout-entry-card.css";
import "../../styles/components/home-feed-card.css";

type HomeFeedCardProps = {
    feedRecord: HomeFeedRecord;
};

/**
 * Карточка записи в Home Feed (UX-HOME §19–24). Использует ту же
 * вёрстку и CSS-классы, что и карточки Дневника (WorkoutEntryCard /
 * DiaryNoteCard) — фото 4:3 → тип+дата → название → площадка →
 * описание → теги (§25 в UX-DIARY) — чтобы запись выглядела
 * одинаково знакомо в обоих местах. Поверх добавлены только автор
 * (шапка) и счётчик комментариев (подвал), которых в личном
 * Дневнике нет.
 *
 * Вся карточка ведёт на саму запись, но автор, площадка и счётчик
 * комментариев — самостоятельные ссылки: клик по ним не должен
 * также срабатывать как клик по карточке (§24).
 */
export default function HomeFeedCard({
    feedRecord,
}: HomeFeedCardProps) {
    const { record, author, playground, commentsCount } = feedRecord;
    const navigate = useNavigate();

    const recordUrl = getDiaryRecordUrl(record);

    const mainPhoto =
        record.data.photos?.find((photo) => photo.isMain) ??
        record.data.photos?.[0];

    const isWorkout = record.type === "workout";

    const title = isWorkout
        ? record.data.title
        : record.data.title ?? getCardDescriptionPreview(record.data.text, 60);

    // Для заметки без заголовка текст уже использован как heading —
    // не дублируем его ещё раз в описании (тот же приём, что в
    // DiaryNoteCard).
    const description = isWorkout
        ? record.data.description
        : record.data.title
          ? record.data.text
          : undefined;

    const tags = record.data.tags;

    const dateDiverges = isActivityDateDivergent(
        record.date,
        record.createdAt
    );

    const primaryTimeLabel = dateDiverges
        ? formatAddedLabel(record.createdAt)
        : formatTimeAgo(record.createdAt);

    function goToRecord() {
        navigate(recordUrl);
    }

    function stopBubbling(event: MouseEvent) {
        event.stopPropagation();
    }

    return (
        <article
            className="workout-entry-card home-feed-card"
            onClick={goToRecord}
            role="link"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    goToRecord();
                }
            }}
        >
            <div className="home-feed-card__author-row">
                <Link
                    to={`/u/${author.nickname}`}
                    className="home-feed-card__author"
                    onClick={stopBubbling}
                >
                    <Avatar
                        name={author.name}
                        avatarUrl={author.avatarUrl}
                        size="sm"
                    />

                    <span className="home-feed-card__author-name">
                        {author.name}
                    </span>
                </Link>
            </div>

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
                    <DiaryRecordTypeBadge type={record.type} />

                    <p className="workout-entry-card__date">
                        {primaryTimeLabel}
                        {
                            isWorkout &&
                                record.data.timeOfDay &&
                                !dateDiverges &&
                                ` • ${getTimeOfDayName(record.data.timeOfDay)}`
                        }
                    </p>
                </div>

                {
                    dateDiverges && (
                        <p className="home-feed-card__event-date">
                            {isWorkout ? "Тренировка" : "Заметка"} от {formatWorkoutEntryDate(record.date)}
                        </p>
                    )
                }

                <h4 className="workout-entry-card__title">
                    {title}
                </h4>

                {
                    playground && (
                        <Link
                            to={`/playgrounds/${playground.id}`}
                            className="workout-entry-card__playground"
                            onClick={stopBubbling}
                        >
                            {playground.name}
                        </Link>
                    )
                }

                {
                    description && (
                        <p className="workout-entry-card__description">
                            {getCardDescriptionPreview(description)}
                        </p>
                    )
                }

                {
                    tags && tags.length > 0 && (
                        <div className="tag-list">
                            {
                                tags.map((tag) => (
                                    <TagBadge
                                        key={tag}
                                        label={tag}
                                    />
                                ))
                            }
                        </div>
                    )
                }

                {
                    commentsCount > 0 && (
                        <button
                            type="button"
                            className="home-feed-card__comments"
                            onClick={(event) => {
                                stopBubbling(event);
                                goToRecord();
                            }}
                        >
                            💬 {commentsCount}
                        </button>
                    )
                }
            </div>
        </article>
    );
}
