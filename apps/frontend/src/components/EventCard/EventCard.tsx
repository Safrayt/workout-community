import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button/Button";
import Card from "../ui/Card/Card";

type EventCardProps = {
    title: string;
    description: string;
    city: string;
    location: string;
    date: string;
    expectedParticipants: number;
    weather?: string;
};

export default function EventCard({
    title,
    description,
    city,
    location,
    date,
    expectedParticipants,
    weather,
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

            <p className="event-card__meta">Ожидается {expectedParticipants} участников</p>

            <p className="event-card__meta">Погода: {weather ?? "—"}</p>

            <div className="event-card__actions">
                <Button variant="secondary">
                    Подробнее
                </Button>
            </div>
        </Card>
    );
}