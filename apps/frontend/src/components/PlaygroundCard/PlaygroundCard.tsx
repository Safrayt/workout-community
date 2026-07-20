import { Link } from "react-router-dom";

import Card from "../ui/Card/Card";
import Button from "../ui/Button/Button";
import "../../styles/components/PlaygroundCard.css";

type PlaygroundCardProps = {
    id: string;

    name: string;

    locality: string;

    description: string;

    lighting: boolean;

    covered: boolean;

    equipment: string[];

    eventsCount: number;

    nextEvent?: string;
};

export default function PlaygroundCard({
    id,
    name,
    locality,
    description,
    lighting,
    covered,
    equipment,
    eventsCount,
    nextEvent,
}: PlaygroundCardProps) {
    return (
        <Card className="playground-card">
            <h3>
                {name}
            </h3>

            <p>
                {locality}
            </p>

            <p>
                {description}
            </p>

            <p>
                Освещение:
                {" "}
                {lighting ? "Есть" : "Нет"}
            </p>

            <p>
                Навес:
                {" "}
                {covered ? "Есть" : "Нет"}
            </p>

            <h4>Оборудование</h4>

            <ul>
                {
                    equipment.map(
                        (item) => (
                            <li key={item}>
                                {item}
                            </li>
                        )
                    )
                }
            </ul>

            <p>
                Событий:
                {" "}
                {eventsCount}
            </p>

            <p>
                Ближайшая тренировка:
                {" "}
                {nextEvent ?? "Не запланирована"}
            </p>

            <Link to={`/playgrounds/${id}`}>
                <Button>
                    Подробнее
                </Button>
            </Link>
        </Card>
    );
}