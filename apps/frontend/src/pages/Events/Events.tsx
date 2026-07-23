import Section from "../../components/ui/Section/Section";
import EventCard from "../../components/EventCard/EventCard";

import { events } from "../../data/events";
import { getParticipantCount } from "../../utils/eventParticipants";

import {
    useRegistration,
} from "../../context/RegistrationContext";

import { Link } from "react-router-dom";

import Button from "../../components/ui/Button/Button";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";




export default function Events() {
    const {
        registrations,
        register,
        cancel,
        checkRegistration,
    } = useRegistration();

    return (
        <Section title="События">
             <ActionGroup>
                <Link to="/events/create">
                    <Button variant="primary">
                        Создать событие
                    </Button>
                </Link>
            </ActionGroup>
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