import Button from "../ui/Button/Button";
import Card from "../ui/Card/Card";
import { formatParticipants } from "../../utils/format";
import { formatEventDate } from "../../utils/formatEventDate";
import { Link } from "react-router-dom";

import type { CSSProperties } from "react";

import {
    useEventWeather,
} from "../../hooks/useEventWeather";

import {
    formatEventWeather,
} from "../../utils/formatEventWeather";

import {
    getEventPosterUrl,
} from "../../utils/eventPoster";

import { getEventStatus, eventStatusLabels } from "../../utils/eventStatus";
import { useUserDirectory } from "../../hooks/useUserDirectory";
import UserLink from "../UserLink/UserLink";

import type {
    Playground,
} from "../../types/playground";

const eventStatusColors: Record<string, string> = {
    upcoming: "var(--color-primary)",
    completed: "var(--color-text-secondary)",
};

type EventStatusBadgeStyle = CSSProperties & {
    "--status-color": string;
};

type EventCardProps = {
    id: string;
    title: string;
    description: string;
    city: string;
    location: string;
    startDate: string;
    expectedParticipants: number;
    posterUrl?: string;
    playground?: Playground;
    creatorId?: string;
    isRegistered?: boolean;
    onRegister?: () => void;
    onCancelRegistration?: () => void;

    /** Клик по карточке (не по конкретной ссылке/кнопке) — центрирует карту на площадке события. */
    onSelect?: () => void;
};

export default function EventCard({
    id,
    title,
    city,
    startDate,
    expectedParticipants,
    posterUrl,
    playground,
    creatorId,
    isRegistered = false,
    onRegister,
    onCancelRegistration,
    onSelect,
}: EventCardProps) {
    const weatherState = useEventWeather(
        startDate,
        playground?.coordinates.latitude,
        playground?.coordinates.longitude
    );

    const { getUserById } = useUserDirectory();

    const creator = creatorId
        ? getUserById(creatorId)
        : undefined;

    const imageUrl =
        getEventPosterUrl(
            posterUrl,
            playground
        );

    const status = getEventStatus({ startDate });

    const statusBadgeStyle: EventStatusBadgeStyle = {
        "--status-color": eventStatusColors[status],
    };

    return (
        <Card
            className="event-card"
            onClick={() => onSelect?.()}
        >
            <div className="event-card__photo-wrapper">
                {
                    imageUrl ? (
                        <img
                            src={imageUrl}
                            alt=""
                            className="event-card__photo"
                        />
                    ) : (
                        <div className="event-card__photo event-card__photo--placeholder">
                            Нет фото
                        </div>
                    )
                }

                <span
                    className="event-card__status"
                    style={statusBadgeStyle}
                >
                    <span className="event-card__status-dot" />
                    {eventStatusLabels[status]}
                </span>
            </div>

            <div className="event-card__body">
                <h3 className="event-card__title">
                    {title}
                </h3>

                <p className="event-card__locality">
                    {city}
                </p>

                <p className="event-card__meta">
                    {formatEventDate(startDate)}
                </p>

                {
                    playground && (
                        <p className="event-card__meta">
                            {playground.name}
                        </p>
                    )
                }

                <p className="event-card__fact">
                    Погода: {formatEventWeather(weatherState)}
                </p>

                <p className="event-card__fact">
                    Ожидается {formatParticipants(expectedParticipants)}
                </p>

                {
                    creator && (
                        <p className="event-card__creator">
                            Создатель события: <UserLink username={creator.nickname} />
                        </p>
                    )
                }

                <div className="event-card__actions">
                    <Button variant={isRegistered ? "secondary" : "primary"}
                        onClick={
                            isRegistered
                                ? onCancelRegistration
                                : onRegister
                        }
                    >
                        {isRegistered
                            ? "Отменить участие"
                            : "Записаться"}
                    </Button>

                    <Link
                        to={`/events/${id}`}
                        className="event-card__link"
                    >
                        <Button variant="outline">
                            Подробнее
                        </Button>
                    </Link>
                </div>
            </div>
        </Card>
    );
}