import Section from "../../components/ui/Section/Section";
import EventCard from "../../components/EventCard/EventCard";

import { events } from "../../data/events";
import { getExpectedParticipants } from "../../utils/registration";

export default function Events() {
    function handleRegister(eventId: string) {
        console.log(`Регистрация на событие ${eventId}`);
    }
    return (
        <Section title="События">
            <div className="events-list">
                {events.map((event) => {
                    const participants =
                        getExpectedParticipants(event.id);

                    return (
                        <EventCard
                            key={event.id}
                            {...event}
                            expectedParticipants={participants}
                            onRegister={() => handleRegister(event.id)}
                        />
                    );
                })}
            </div>
        </Section>
    );
}