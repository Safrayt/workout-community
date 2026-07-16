import type { Event } from "../../types/event";
import "../../styles/components/event-summary.css";

import type { EventRegistration } from "../../types/eventRegistration";
import { getParticipantCount } from "../../utils/eventParticipants";

type EventSummaryProps = {
    event: Event;
    registrations: EventRegistration[];
};

export default function EventSummary({
    event,
    registrations,
}: EventSummaryProps) {
    const participantCount =
    getParticipantCount(
        registrations,
        event.id
    );
    return (
        <div className="event-summary">
            <h4>{event.title}</h4>

            <p>{event.city}</p>

            <p>{event.location}</p>

            <p>{event.date}</p>

            <p>
                 Записано участников: {participantCount}
            </p>
        </div>
    );
}