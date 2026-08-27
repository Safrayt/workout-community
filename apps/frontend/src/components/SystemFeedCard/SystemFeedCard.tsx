import { Link, useNavigate } from "react-router-dom";
import type { MouseEvent } from "react";

import type { SystemFeedItem } from "../../types/homeFeedRecord";
import type { Playground } from "../../types/playground";

import Avatar from "../ui/Avatar/Avatar";
import DiaryRecordTypeBadge from "../DiaryRecordTypeBadge/DiaryRecordTypeBadge";

import { formatTimeAgo } from "../../utils/timeAgo";
import { formatEventDateShort } from "../../utils/formatEventDate";
import { getEventPosterUrl } from "../../utils/eventPoster";
import { getPlaygroundById } from "../../utils/playgrounds";

import "../../styles/components/workout-entry-card.css";
import "../../styles/components/home-feed-card.css";

type SystemFeedCardProps = {
    feedRecord: SystemFeedItem;

    /**
     * Нужна только для карточки мероприятия — чтобы показать фото
     * площадки как запасной вариант, если у самого мероприятия нет
     * афиши (см. getEventPosterUrl), и её адрес рядом с названием.
     */
    playgrounds: Playground[];
};

/**
 * Карточка системной записи в Home Feed — "создано мероприятие" или
 * "новая площадка" (UX-HOME: см. запрос на системные оповещения).
 * Использует ту же вёрстку, что и HomeFeedCard/карточки Дневника —
 * фото → тип+дата → название → адрес/площадка, — чтобы не выглядеть
 * инородно рядом с обычными записями в одной ленте. Отличие только
 * в источнике данных (Event/Playground вместо DiaryRecord) и в
 * отсутствии описания и счётчика комментариев — для этих системных
 * событий их просто не бывает.
 */
export default function SystemFeedCard({
    feedRecord,
    playgrounds,
}: SystemFeedCardProps) {
    const { record, author } = feedRecord;
    const navigate = useNavigate();

    const isEvent = record.type === "event_created";

    const recordUrl = isEvent
        ? `/events/${record.data.id}`
        : `/playgrounds/${record.data.id}`;

    const eventPlayground = isEvent
        ? getPlaygroundById(playgrounds, record.data.playgroundId)
        : undefined;

    const photoUrl = isEvent
        ? getEventPosterUrl(record.data.posterUrl, eventPlayground)
        : record.data.photos.find((photo) => photo.isMain)?.url ??
          record.data.photos[0]?.url;

    const title = isEvent ? record.data.title : record.data.name;

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
                        name={author.nickname}
                        avatarUrl={author.avatarUrl}
                        size="sm"
                    />

                    <span className="home-feed-card__author-name">
                        {author.nickname}
                    </span>
                </Link>
            </div>

            {
                photoUrl && (
                    <img
                        src={photoUrl}
                        alt=""
                        className="workout-entry-card__photo"
                    />
                )
            }

            <div className="workout-entry-card__body">
                <div className="workout-entry-card__meta">
                    <DiaryRecordTypeBadge type={record.type} />

                    <p className="workout-entry-card__date">
                        {formatTimeAgo(record.createdAt)}
                    </p>
                </div>

                <h4 className="workout-entry-card__title">
                    {title}
                </h4>

                {
                    /*
                     * Дополнительные данные типа записи (UX-документ
                     * §7): для события — время проведения и площадка
                     * отдельными строками с иконками; для площадки —
                     * адрес. Раздел не показывается, если данных нет
                     * (для площадки без явного адреса).
                     */
                    isEvent ? (
                        <div className="home-feed-card__extra">
                            <p className="home-feed-card__extra-line">
                                <span aria-hidden="true">◷</span>{" "}
                                {formatEventDateShort(record.data.startDate)}
                            </p>

                            {
                                eventPlayground && (
                                    <Link
                                        to={`/playgrounds/${eventPlayground.id}`}
                                        className="home-feed-card__extra-line home-feed-card__extra-line--link"
                                        onClick={stopBubbling}
                                    >
                                        <span aria-hidden="true">⌖</span>{" "}
                                        {eventPlayground.name}
                                    </Link>
                                )
                            }
                        </div>
                    ) : (
                        <div className="home-feed-card__extra">
                            <p className="home-feed-card__extra-line">
                                <span aria-hidden="true">⌖</span>{" "}
                                {record.data.locality}, {record.data.address}
                            </p>
                        </div>
                    )
                }
            </div>
        </article>
    );
}
