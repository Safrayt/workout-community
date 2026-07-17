import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button/Button";
import Card from "../ui/Card/Card";
import { formatParticipants } from "../../utils/format";
import { formatEventDate } from "../../utils/formatEventDate";

type EventCardProps = {
    title: string;
    description: string;
    city: string;
    location: string;
    startDate: string;
    expectedParticipants: number;
    weather?: string;
    isRegistered?: boolean;
    onRegister?: () => void;
    onCancelRegistration?: () => void;
};

export default function EventCard({
    title,
    description,
    city,
    location,
    startDate,
    expectedParticipants,
    weather,
    isRegistered = false,
    onRegister,
    onCancelRegistration,
}: EventCardProps) {
    return (
        <Card className="event-card">
            <Badge>
                Открытая тренировка
            </Badge>

            <h3 className="event-card__title">
                {title}
            </h3>

            <p className="event-card__meta">{description}</p>

            <p className="event-card__meta">{city}</p>

            <p className="event-card__meta">{location}</p>

            <p className="event-card__meta">{formatEventDate(startDate)}</p>

            <p className="event-card__meta">Ожидается {formatParticipants(expectedParticipants)}</p>

            <p className="event-card__meta">Погода: {weather ?? "—"}</p>

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

                <Button variant="secondary">
                    Подробнее
                </Button>
            </div>
        </Card>
    );
}