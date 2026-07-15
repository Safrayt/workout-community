import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button/Button";
import Card from "../ui/Card/Card";
import { formatParticipants } from "../../utils/format";

type EventCardProps = {
    title: string;
    description: string;
    city: string;
    location: string;
    date: string;
    expectedParticipants: number;
    weather?: string;
    onRegister?: () => void;
};

export default function EventCard({
    title,
    description,
    city,
    location,
    date,
    expectedParticipants,
    weather,
    onRegister,
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

            <p className="event-card__meta">{date}</p>

            <p className="event-card__meta">Ожидается {formatParticipants(expectedParticipants)}</p>

            <p className="event-card__meta">Погода: {weather ?? "—"}</p>

            <div className="event-card__actions">
                <Button variant="primary" onClick={onRegister}>
                    Записаться
                </Button>

                <Button variant="secondary">
                    Подробнее
                </Button>
            </div>
        </Card>
    );
}