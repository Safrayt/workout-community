import Section from "../../components/ui/Section/Section";
import EventCard from "../../components/EventCard/EventCard";

import { events } from "../../data/events";

export default function Events() {
    return (
        <Section title="События">
            <div className="events-list">
                {events.map((event) => (
                    <EventCard
                        key={event.id}
                        {...event}
                    />
                ))}
            </div>
        </Section>
    );
}