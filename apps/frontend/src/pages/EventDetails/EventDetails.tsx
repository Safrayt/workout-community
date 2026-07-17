import { useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";

import { events } from "../../data/events";

import { formatEventDate } from "../../utils/formatEventDate";

import { getPlaygroundById } from "../../utils/playgrounds";

import { Link } from "react-router-dom";


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

     const playground =
    getPlaygroundById(
        event.playgroundId
    );

    return (
        <Section title={event.title}>
            <p>{event.description}</p>

            <p>
                <strong>Населённый пункт:</strong>{" "}
                {playground?.locality ?? "—"}
            </p>

            <p>
                <strong>Площадка:</strong>{" "}
                {playground?.name ?? "—"}
            </p>

            <p>
                <strong>Адрес:</strong>{" "}
                {playground?.address ?? "—"}
            </p>

            <p>
                <strong>Дата:</strong>{" "}
                {formatEventDate(event.startDate)}
            </p>

            <p>
                <strong>Погода:</strong>{" "}
                {event.weather ?? "—"}
            </p>

            <Link to={`/playgrounds/${playground?.id}`}>
                Открыть страницу площадки
            </Link>
        </Section>
    );
}