import { useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";

import { getPlaygroundById } from "../../utils/playgrounds";

import { events } from "../../data/events";

import { getPlaygroundEvents } from "../../utils/playgroundEvents";

import { Link } from "react-router-dom";

export default function PlaygroundDetails() {
    const { id } = useParams();

    const playground = id
        ? getPlaygroundById(id)
        : undefined;

    if (!playground) {
        return (
            <Section title="Площадка">
                <p>Площадка не найдена.</p>
            </Section>
        );
    }

    const playgroundEvents =
    getPlaygroundEvents(
        events,
        playground.id
    );

    return (
        <Section title={playground.name}>
            <p>
                <strong>Населённый пункт:</strong>{" "}
                {playground.locality}
            </p>

            <p>
                <strong>Адрес:</strong>{" "}
                {playground.address}
            </p>

            <p>{playground.description}</p>

            <p>
                Освещение:{" "}
                {playground.lighting
                    ? "Есть"
                    : "Нет"}
            </p>

            <p>
                Навес:{" "}
                {playground.covered
                    ? "Есть"
                    : "Нет"}
            </p>

            <h3>Предстоящие события</h3>
            {
                playgroundEvents.length === 0 ? (
                    <p>
                        Для этой площадки пока нет событий.
                    </p>
                ) : (
                    <ul>
                        {
                            playgroundEvents.map(
                                (event) => (
                                    <li key={event.id}>
                                        <Link to={`/events/${event.id}`}>
                                            {event.title}
                                        </Link>
                                    </li>
                                )
                            )
                        }
                    </ul>
                )
            }

        </Section>
    );
}