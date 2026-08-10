import { Link } from "react-router-dom";

import Card from "../ui/Card/Card";
import Button from "../ui/Button/Button";
import RatingBadge from "../ui/RatingBadge/RatingBadge";

import "../../styles/components/PlaygroundCard.css";

import type { Playground } from "../../types/playground";
import type { Event } from "../../types/event";

import {
    playgroundSizes,
    playgroundSurfaces,
    playgroundAccessLabels,
    playgroundConditionLabels,
    playgroundConditionColors,
} from "../../constants/playgroundProperties";

import { calculatePlaygroundRating } from "../../utils/playgroundRating";
import { formatEventDateShort } from "../../utils/formatEventDate";

type PlaygroundCardProps = {
    playground: Playground;

    /** Ближайшее предстоящее мероприятие на площадке, если есть. */
    nearestEvent?: Event;

    /**
     * Подсвечена ли карточка (площадка выбрана — кликом по самой
     * карточке или по её маркеру на карте).
     */
    highlighted?: boolean;

    /** Наведение/уход курсора с карточки — для подсветки маркера на карте. */
    onHoverChange?: (hovering: boolean) => void;

    /** Клик по карточке (не по конкретной ссылке) — выбор площадки для синхронизации с картой. */
    onSelect?: () => void;
};

export default function PlaygroundCard({
    playground,
    nearestEvent,
    highlighted = false,
    onHoverChange,
    onSelect,
}: PlaygroundCardProps) {
    const {
        id,
        name,
        locality,
        photos,
        size,
        surface,
        equipment,
        condition,
        access,
    } = playground;

    const mainPhoto =
        photos.find((photo) => photo.isMain) ??
        photos[0];

    const rating = calculatePlaygroundRating(playground);

    return (
        <Card
            id={`playground-card-${id}`}
            className={
                highlighted
                    ? "playground-card playground-card--highlighted"
                    : "playground-card"
            }
            onMouseEnter={() => onHoverChange?.(true)}
            onMouseLeave={() => onHoverChange?.(false)}
            onClick={() => onSelect?.()}
        >
            <div className="playground-card__photo-wrapper">
                {
                    mainPhoto ? (
                        <img
                            src={mainPhoto.url}
                            alt=""
                            className="playground-card__photo"
                        />
                    ) : (
                        <div className="playground-card__photo playground-card__photo--placeholder">
                            Нет фото
                        </div>
                    )
                }

                <div className="playground-card__rating">
                    <RatingBadge
                        rating={rating}
                        showMax={false}
                    />
                </div>
            </div>

            <div className="playground-card__body">
                <h3 className="playground-card__name">
                    {name}
                </h3>

                <p className="playground-card__locality">
                    {locality}
                </p>

                <p className="playground-card__meta">
                    {`${equipment.length} эл.`}
                    {" · "}
                    {playgroundSizes[size]}
                    {" · "}
                    {playgroundSurfaces[surface]}
                </p>

                <p className="playground-card__meta">
                    <span
                        style={{
                            color: playgroundConditionColors[condition],
                        }}
                    >
                        {playgroundConditionLabels[condition]}
                    </span>

                    {" · "}
                    {playgroundAccessLabels[access]}
                </p>

                {
                    nearestEvent && (
                        <p className="playground-card__event">
                            <span className="playground-card__event-icon" aria-hidden="true">
                                📅
                            </span>

                            {formatEventDateShort(nearestEvent.startDate)}
                        </p>
                    )
                }

                <Link
                    to={`/playgrounds/${id}`}
                    className="playground-card__link"
                >
                    <Button variant="outline">
                        Подробнее
                    </Button>
                </Link>
            </div>
        </Card>
    );
}
