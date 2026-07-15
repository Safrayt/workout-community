import Section from "../../components/ui/Section/Section";
import EventCard from "../../components/EventCard/EventCard";

import { events } from "../../data/events";
import { getExpectedParticipants, isUserRegistered, } from "../../utils/registration";

import { useState } from "react";
import { registrations as initialRegistrations } from "../../data/registrations";
import type { EventRegistration } from "../../types/eventRegistration";

export default function Events() {
    
    const [registrations, setRegistrations] =
        useState(initialRegistrations);

    function handleRegister(eventId: string) {
        const currentUserId = "1";
            if (
                isUserRegistered(
                    registrations,
                    currentUserId,
                    eventId
                )
            ) {
                return;
            }
        const newRegistration: EventRegistration = {
            id: crypto.randomUUID(),

            userId: "1",

            eventId,

            registeredAt: new Date().toISOString(),

            status: "registered",

            experienceAwarded: 0,
        };

        setRegistrations((previous) => [
            ...previous,
            newRegistration,
        ]);
    }
    function handleCancelRegistration(eventId: string) {
        const currentUserId = "1";

        setRegistrations((previous) =>
            previous.filter(
                (registration) =>
                    !(
                        registration.userId === currentUserId &&
                        registration.eventId === eventId
                    )
            )
        );
    }
    
    return (
        <Section title="События">
            <div className="events-list">
                {events.map((event) => {
                    const participants =
                        getExpectedParticipants(
                            registrations,
                            event.id
                        );
                    const registered = isUserRegistered(
                        registrations,
                        "1",
                        event.id
                    );

                    return (
                        <EventCard
                            key={event.id}
                            {...event}
                            expectedParticipants={participants}
                            isRegistered={registered}
                            onRegister={() => handleRegister(event.id)}
                            onCancelRegistration={() => handleCancelRegistration(event.id)}
                        />
                    );
                })}
            </div>
        </Section>
    );
}