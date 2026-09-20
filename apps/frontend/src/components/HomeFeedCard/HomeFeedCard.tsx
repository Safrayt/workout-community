import { useNavigate, Link } from "react-router-dom";
import type { MouseEvent } from "react";

import type { HomeFeedRecord } from "../../types/homeFeedRecord";

import Avatar from "../ui/Avatar/Avatar";

import { isActivityDateDivergent } from "../../utils/timeAgo";
import { formatWorkoutEntryDate } from "../../utils/formatWorkoutEntryDate";
import { getTimeOfDayName } from "../../utils/timeOfDay";
import { getCardDescriptionPreview } from "../../utils/workoutEntryDescription";
import { getDiaryRecordUrl } from "../../utils/diaryRecords";
import { truncateText } from "../../utils/truncateText";

import "../../styles/components/workout-entry-card.css";
import "../../styles/components/home-feed-card.css";

type HomeFeedCardProps = {
    feedRecord: HomeFeedRecord;
};

const TYPE_TAGS: Record<HomeFeedRecord["record"]["type"], string> = {
    workout: "Тренировка",
    note: "Заметка",
};

// Общая лента — самое плотное место в приложении: тут одна за другой
// идут карточки разных пользователей, длинные заголовок или описание
// сминают вёрстку и мешают быстро пролистывать ленту. На странице
// самого Дневника (WorkoutEntryCard/DiaryNoteCard) этого ограничения
// нет — там карточек меньше и они уже "свои".
const MAX_FEED_TITLE_LENGTH = 50;
const MAX_FEED_DESCRIPTION_LENGTH = 100;

/**
 * Карточка записи в Home Feed (UX-HOME §19–24). Оформление общее с
 * SystemFeedCard (макет от 2026-09): аватар наполовину наезжает на
 * фото, тип записи — короткая пометка в квадратных скобках прямо в
 * заголовке вместо отдельного цветного бейджа, время публикации
 * ("2 часа назад") не показывается вовсе — это был шум. Дата самой
 * тренировки/заметки, когда она отличается от даты публикации —
 * содержательная информация, а не шум, поэтому осталась, только
 * переехала строкой ниже заголовка, вместе с временем суток и
 * площадкой — там же, где у SystemFeedCard время и место мероприятия.
 *
 * Вся карточка ведёт на саму запись, но автор, площадка и счётчик
 * комментариев — самостоятельные ссылки: клик по ним не должен
 * также срабатывать как клик по карточке (§24).
 *
 * Пометка "Скрыто приватностью" показывается, если у автора
 * diary_visible=false — специального флага "это вкладка
 * Администрирование" сюда прокидывать не нужно: в обычных вкладках
 * ("Все записи"/"Подписки") бэкенд и так уже не отдаёт записи таких
 * авторов (см. _visible_diary_user_ids на бэкенде), так что условие
 * ниже фактически истинно только для карточек, дошедших сюда через
 * include_hidden=true.
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

    const title = truncateText(
        isWorkout
            ? record.data.title
            : record.data.title ??
                  getCardDescriptionPreview(record.data.text, 60),
        MAX_FEED_TITLE_LENGTH
    );

    // Для заметки без заголовка текст уже использован как heading —
    // не дублируем его ещё раз в описании (тот же приём, что в
    // DiaryNoteCard).
    const description = isWorkout
        ? record.data.description
        : record.data.title
          ? record.data.text
          : undefined;

    const dateDiverges = isActivityDateDivergent(
        record.date,
        record.createdAt
    );

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
            {
                mainPhoto && (
                    <img
                        src={mainPhoto.url}
                        alt=""
                        className="workout-entry-card__photo"
                    />
                )
            }

            <div
                className={`home-feed-card__author-row home-feed-card__author-row--overlay ${
                    mainPhoto ? "" : "home-feed-card__author-row--no-photo"
                }`}
            >
                <Link
                    to={`/u/${author.nickname}`}
                    className="home-feed-card__author"
                    onClick={stopBubbling}
                >
                    <Avatar
                        name={author.nickname}
                        avatarUrl={author.avatarUrl}
                        size="sm"
                    />

                    <span className="home-feed-card__author-name">
                        {author.nickname}
                    </span>
                </Link>
            </div>

            <div className="workout-entry-card__body workout-entry-card__body--system">
                {
                    !author.privacySettings.diaryVisible && (
                        <span className="home-feed-card__privacy-badge">
                            🔒 Скрыто приватностью
                        </span>
                    )
                }

                {
                    record.data.isPrivate && (
                        <span className="private-record-badge">
                            Личное
                        </span>
                    )
                }

                <h4 className="workout-entry-card__title">
                    <span
                        className={`home-feed-card__type-tag home-feed-card__type-tag--${record.type}`}
                    >
                        [{TYPE_TAGS[record.type]}]
                    </span>{" "}
                    {title}
                </h4>

                <div className="home-feed-card__extra">
                    {
                        dateDiverges && (
                            <p className="home-feed-card__extra-line">
                                <span aria-hidden="true">◷</span>{" "}
                                {isWorkout ? "Тренировка" : "Заметка"} от{" "}
                                {formatWorkoutEntryDate(record.date)}
                            </p>
                        )
                    }

                    {
                        isWorkout && record.data.timeOfDay && !dateDiverges && (
                            <p className="home-feed-card__extra-line">
                                <span aria-hidden="true">☀</span>{" "}
                                {getTimeOfDayName(record.data.timeOfDay)}
                            </p>
                        )
                    }

                    {
                        playground && (
                            <Link
                                to={`/playgrounds/${playground.id}`}
                                className="home-feed-card__extra-line home-feed-card__extra-line--link"
                                onClick={stopBubbling}
                            >
                                <span aria-hidden="true">⌖</span>{" "}
                                {playground.name}
                            </Link>
                        )
                    }
                </div>

                {
                    description && (
                        <p className="workout-entry-card__description">
                            {getCardDescriptionPreview(
                                description,
                                MAX_FEED_DESCRIPTION_LENGTH
                            )}
                        </p>
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
