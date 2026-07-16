import Section from "../../components/ui/Section/Section";
import EventCard from "../../components/EventCard/EventCard";

import { events } from "../../data/events";
import { getParticipantCount } from "../../utils/eventParticipants";

import {
    useRegistration,
} from "../../context/RegistrationContext";




export default function Events() {
    const {
        registrations,
        register,
        cancel,
        checkRegistration,
    } = useRegistration();

    return (
        <Section title="События">
            <div className="events-list">
                {events.map((event) => {
                    const participants =
                        getParticipantCount(
                            registrations,
                            event.id
                        );
                    const registered = checkRegistration(event.id);

                    return (
                        <EventCard
                            key={event.id}
                            {...event}
                            expectedParticipants={participants}
                            isRegistered={registered}
                            onRegister={() => register(event.id)}
                            onCancelRegistration={() => cancel(event.id)}
                        />
                    );
                })}
            </div>
        </Section>
    );
}