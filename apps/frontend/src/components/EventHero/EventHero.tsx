import "../../styles/components/event-hero.css";

import type {
    Event,
} from "../../types/event";

import Badge from "../ui/Badge/Badge";

import {
    getEventStatus,
    eventStatusLabels,
} from "../../utils/eventStatus";

import EventRegistration from "../EventRegistration/EventRegistration";

type Props = {

    event: Event;

};

/**
 * Верхний блок страницы события (UX-спецификация, §7, §45).
 *
 * Задача Hero — дать пользователю понять суть события за
 * несколько секунд: формат, название, дату, время и статус,
 * плюс сразу предложить главное действие страницы —
 * "Хочу участвовать" / "Я участвую" (§11).
 *
 * Формат события всегда один ("Общая тренировка"), поэтому
 * отдельного селектора формата нет — только статичный badge (§9).
 */
export default function EventHero({
    event,
}: Props) {

    const status =
        getEventStatus(event);

    return (

        <header className="event-hero">

            <div className="event-hero__badges">

                <span className="event-hero__format-badge">
                    Общая тренировка
                </span>

                <Badge
                    variant={
                        status === "upcoming"
                            ? "success"
                            : "warning"
                    }
                >
                    {eventStatusLabels[status]}
                </Badge>

            </div>

            <h1 className="event-hero__title">
                {event.title}
            </h1>

            {
                status === "upcoming" && (
                    <div className="event-hero__action">
                        <EventRegistration
                            eventId={event.id}
                        />
                    </div>
                )
            }

        </header>

    );

}
