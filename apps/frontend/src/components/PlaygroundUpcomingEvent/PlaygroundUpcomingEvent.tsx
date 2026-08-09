import { Link } from "react-router-dom";

import "../../styles/components/playground-upcoming-event.css";

import type { Event } from "../../types/event";
import type { EventRegistration } from "../../types/eventRegistration";

import { isUpcomingEvent } from "../../utils/eventStatus";
import { getParticipantCount } from "../../utils/eventParticipants";
import { formatEventDate } from "../../utils/formatEventDate";

import InfoSection from "../ui/InfoSection/InfoSection";
import Button from "../ui/Button/Button";

export const UPCOMING_EVENTS_LIMIT = 3;

type Props = {
    playgroundId: string;

    events: Event[];

    registrations: EventRegistration[];
};

/**
 * Ближайшие мероприятия площадки (до 3 штук) — крупно и в один клик,
 * сразу под отзывами. Полный список всех мероприятий площадки
 * (прошедших и будущих) — по кнопке "Все мероприятия".
 */
export default function PlaygroundUpcomingEvent({
    playgroundId,
    events,
    registrations,
}: Props) {
    const upcomingEvents = [...events]
        .filter(isUpcomingEvent)
        .sort(
            (a, b) =>
                new Date(a.startDate).getTime() -
                new Date(b.startDate).getTime()
        )
        .slice(0, UPCOMING_EVENTS_LIMIT);

    return (
        <InfoSection title="Ближайшие мероприятия">
            {
                upcomingEvents.length === 0

                    ? (

                        <>
                            <p>
                                Пока никто не запланировал тренировку здесь.
                            </p>

                            <Link to="/events/create">
                                <Button variant="outline">
                                    Создать мероприятие
                                </Button>
                            </Link>
                        </>

                    )

                    : (

                        <div className="playground-upcoming-events">

                            {
                                upcomingEvents.map((event) => {
                                    const participantCount =
                                        getParticipantCount(
                                            registrations,
                                            event.id
                                        );

                                    return (

                                        <Link
                                            key={event.id}
                                            to={`/events/${event.id}`}
                                            className="playground-upcoming-event"
                                        >
                                            <div className="playground-upcoming-event__main">
                                                <h4 className="playground-upcoming-event__title">
                                                    {event.title}
                                                </h4>

                                                <p className="playground-upcoming-event__date">
                                                    {formatEventDate(event.startDate)}
                                                </p>
                                            </div>

                                            <div className="playground-upcoming-event__participants">
                                                {participantCount}
                                                {" "}
                                                записано
                                            </div>
                                        </Link>

                                    );
                                })
                            }

                        </div>

                    )
            }

            <div className="playground-upcoming-event__actions">
                <Link to={`/playgrounds/${playgroundId}/events`}>
                    <Button variant="outline">
                        Все мероприятия
                    </Button>
                </Link>
            </div>
        </InfoSection>
    );
}
