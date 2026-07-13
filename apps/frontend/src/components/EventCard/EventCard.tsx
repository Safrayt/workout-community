import Badge from "../ui/Badge/Badge";
import Button from "../ui/Button/Button";
import Card from "../ui/Card/Card";

type EventCardProps = {
    title: string;
    location: string;
    date: string;
    participants: number;
};

export default function EventCard({
    title,
    location,
    date,
    participants,
}: EventCardProps) {
    return (
        <Card className="event-card">
            <Badge>
                Открытая
            </Badge>

            <h3 className="event-card__title">
                {title}
            </h3>

            <p className="event-card__meta">{location}</p>

            <p className="event-card__meta">{date}</p>

            <p className="event-card__meta">{participants} участников</p>

            <div className="event-card__actions">
                <Button variant="secondary">
                    Подробнее
                </Button>
            </div>
        </Card>
    );
}