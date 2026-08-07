import { Link } from "react-router-dom";

import "../../styles/components/playground-upcoming-event.css";

import type { Event } from "../../types/event";
import type { EventRegistration } from "../../types/eventRegistration";

import { isUpcomingEvent } from "../../utils/eventStatus";
import { getParticipantCount } from "../../utils/eventParticipants";
import { formatEventDate } from "../../utils/formatEventDate";

import InfoSection from "../ui/InfoSection/InfoSection";
import Button from "../ui/Button/Button";

type Props = {
    events: Event[];

    registrations: EventRegistration[];
};

/**
 * Ближайшее мероприятие площадки — крупно и в один клик,
 * ещё до общего списка. Документ прямо требует:
 * "Upcoming events are always displayed above reviews."
 */
export default function PlaygroundUpcomingEvent({
    events,
    registrations,
}: Props) {
    const nextEvent = [...events]
        .filter(isUpcomingEvent)
        .sort(
            (a, b) =>
                new Date(a.startDate).getTime() -
                new Date(b.startDate).getTime()
        )[0];

    if (!nextEvent) {
        return (
            <InfoSection title="Ближайшее мероприятие">
                <p>
                    Пока никто не запланировал тренировку здесь.
                </p>

                <Link to="/events/create">
                    <Button variant="outline">
                        Создать мероприятие
                    </Button>
                </Link>
            </InfoSection>
        );
    }

    const participantCount = getParticipantCount(
        registrations,
        nextEvent.id
    );

    return (
        <InfoSection title="Ближайшее мероприятие">
            <Link
                to={`/events/${nextEvent.id}`}
                className="playground-upcoming-event"
            >
                <div className="playground-upcoming-event__main">
                    <h4 className="playground-upcoming-event__title">
                        {nextEvent.title}
                    </h4>

                    <p className="playground-upcoming-event__date">
                        {formatEventDate(nextEvent.startDate)}
                    </p>
                </div>

                <div className="playground-upcoming-event__participants">
                    {participantCount}
                    {" "}
                    записано
                </div>
            </Link>
        </InfoSection>
    );
}
