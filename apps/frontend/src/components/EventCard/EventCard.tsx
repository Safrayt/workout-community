import Button from "../ui/Button/Button";
import Card from "../ui/Card/Card";
import { formatParticipants } from "../../utils/format";
import { formatEventDate } from "../../utils/formatEventDate";
import { Link } from "react-router-dom";

import {
    useEventWeather,
} from "../../hooks/useEventWeather";

import {
    formatEventWeather,
} from "../../utils/formatEventWeather";

import {
    getEventPosterUrl,
} from "../../utils/eventPoster";

import type {
    Playground,
} from "../../types/playground";

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
    isRegistered?: boolean;
    onRegister?: () => void;
    onCancelRegistration?: () => void;
};

export default function EventCard({
    id,
    title,
    description,
    city,
    location,
    startDate,
    expectedParticipants,
    posterUrl,
    playground,
    isRegistered = false,
    onRegister,
    onCancelRegistration,
}: EventCardProps) {
    const weatherState = useEventWeather(
        startDate,
        playground?.coordinates.latitude,
        playground?.coordinates.longitude
    );

    const imageUrl =
        getEventPosterUrl(
            posterUrl,
            playground
        );

    return (
        <Card className="event-card">
            <div className="event-card__layout">
                {
                    imageUrl && (
                        <img
                            src={imageUrl}
                            alt={title}
                            className="event-card__poster"
                        />
                    )
                }

                <div className="event-card__content">
                    <h3 className="event-card__title">
                        {title}
                    </h3>

                    <p className="event-card__meta">{formatEventDate(startDate)}</p>

                    <p className="event-card__meta">{city}</p>

                    <p className="event-card__meta">{location}</p>

                    <p className="event-card__description">{description}</p>

                    <p className="event-card__meta">Погода: {formatEventWeather(weatherState)}</p>

                    <p className="event-card__meta">Ожидается {formatParticipants(expectedParticipants)}</p>
                </div>
            </div>

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

                <Link to={`/events/${id}`}>
                    <Button variant="secondary">
                        Подробнее
                    </Button>
                </Link>
            </div>
        </Card>
    );
}