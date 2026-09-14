import { Link, useNavigate } from "react-router-dom";
import type { MouseEvent } from "react";

import type { SystemFeedItem } from "../../types/homeFeedRecord";
import type { Playground } from "../../types/playground";

import Avatar from "../ui/Avatar/Avatar";

import { formatEventDateShort } from "../../utils/formatEventDate";
import { getEventPosterUrl } from "../../utils/eventPoster";
import { getPlaygroundById } from "../../utils/playgrounds";
import { truncateText } from "../../utils/truncateText";

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
 * Короткая, согласованная по роду с заголовком пометка типа записи —
 * показывается как "[Пометка] Заголовок" прямо в самом заголовке
 * (макет от 2026-09), а не отдельным цветным бейджем над карточкой,
 * как раньше (см. git-историю компонента) или как до сих пор
 * оформлены карточки дневника (DiaryRecordTypeBadge).
 */
const TYPE_TAGS: Record<SystemFeedItem["record"]["type"], string> = {
    event_created: "Создана",
    playground_created: "Новая",
};

const MAX_FEED_TITLE_LENGTH = 50;

/**
 * Карточка системной записи в Home Feed — "создано мероприятие" или
 * "новая площадка". Автор показан как аватар, наполовину наезжающий
 * на нижний край фото, с именем рядом под ним — так, как попросили
 * оформить именно эти карточки (макет от 2026-09). Время публикации
 * умышленно не показывается вовсе — в отличие от карточек дневника,
 * где эта дата несёт смысл (когда что-то произошло), здесь это
 * просто шум.
 *
 * Карточки дневника (HomeFeedCard) в общей ленте пока оформлены
 * по-старому — там ещё расхождение даты события с датой публикации,
 * время суток и счётчик комментариев, которых в этом макете не было.
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

    const title = truncateText(
        isEvent ? record.data.title : record.data.name,
        MAX_FEED_TITLE_LENGTH
    );

    function goToRecord() {
        navigate(recordUrl);
    }

    function stopBubbling(event: MouseEvent) {
        event.stopPropagation();
    }

    return (
        <article
            className="workout-entry-card home-feed-card home-feed-card--system"
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
                photoUrl && (
                    <img
                        src={photoUrl}
                        alt=""
                        className="workout-entry-card__photo"
                    />
                )
            }

            <div className="home-feed-card__author-row home-feed-card__author-row--overlay">
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
                <h4 className="workout-entry-card__title">
                    <span
                        className={`home-feed-card__type-tag home-feed-card__type-tag--${record.type}`}
                    >
                        [{TYPE_TAGS[record.type]}]
                    </span>{" "}
                    {title}
                </h4>

                {
                    /*
                     * Дополнительные данные типа записи: для события —
                     * время проведения и площадка отдельными строками с
                     * иконками; для площадки — адрес. Раздел не
                     * показывается, если данных нет (для площадки без
                     * явного адреса).
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
