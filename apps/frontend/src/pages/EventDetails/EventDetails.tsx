import { useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";

import { events } from "../../data/events";

import { formatEventDate } from "../../utils/formatEventDate";

export default function EventDetails() {
    const { id } = useParams();

    const event = events.find(
        (event) => event.id === id
    );

    if (!event) {
        return (
            <Section title="Событие">
                <p>Событие не найдено.</p>
            </Section>
        );
    }

    return (
        <Section title={event.title}>
            <p>{event.description}</p>

            <p>
                <strong>Населённый пункт:</strong>{" "}
                {event.city}
            </p>

            <p>
                <strong>Место проведения:</strong>{" "}
                {event.location}
            </p>

            <p>
                <strong>Дата:</strong>{" "}
                {formatEventDate(event.startDate)}
            </p>

            <p>
                <strong>Погода:</strong>{" "}
                {event.weather ?? "—"}
            </p>
        </Section>
    );
}