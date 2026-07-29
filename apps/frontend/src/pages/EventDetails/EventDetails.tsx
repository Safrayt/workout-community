import { useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";

import {
    useEvents,
} from "../../context/EventContext";

import { formatEventDate } from "../../utils/formatEventDate";
import { formatParticipants } from "../../utils/format";

import { getPlaygroundById } from "../../utils/playgrounds";
import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import { Link } from "react-router-dom";

import InfoSection from "../../components/ui/InfoSection/InfoSection";
import InfoRow from "../../components/ui/InfoRow/InfoRow";
import {
    getEventById,
    getRegisteredParticipantsCount,
} from "../../utils/events";

import {
    useRegistration,
} from "../../context/RegistrationContext";

import {
    getEventRegistrations,
} from "../../utils/eventRegistrations";

import EventParticipants from "../../components/EventParticipants/EventParticipants";
import EventRegistration from "../../components/EventRegistration/EventRegistration";
import EventInfo from "../../components/EventInfo/EventInfo";


export default function EventDetails() {
    const { id } = useParams();

    const {
        events,
    } = useEvents();

    const {
        playgrounds,
    } = usePlaygrounds();

    const event =
    id
        ? getEventById(
            events,
            id
        )
        : undefined;

    if (!event) {
        return (
            <Section title="Событие">
                <p>Событие не найдено.</p>
            </Section>
        );
    }

    const playground =
        getPlaygroundById(
            playgrounds,
            event.playgroundId
        );

    const {
        registrations,
    } = useRegistration();

    const participants =
        getEventRegistrations(
            registrations,
            event.id
        );

    const participantsCount =
        participants.length;

    return (
        <Section title={event.title}>
            <EventInfo
                event={event}
                playground={playground}
            />

            <InfoSection title="Участники">

                <InfoRow label="Записалось">
                    {formatParticipants(
                        participantsCount
                    )}
                </InfoRow>

                <EventParticipants
                    participants={
                        participants
                    }
                />

            </InfoSection>

            <InfoSection title="Участие">

                <EventRegistration
                    eventId={event.id}
                />

            </InfoSection>

            <InfoSection title="Место проведения">

                {
                    playground ? (
                        <Link
                            to={`/playgrounds/${playground.id}`}
                        >
                            Открыть страницу площадки
                        </Link>
                    ) : (
                        <p>
                            Площадка не найдена.
                        </p>
                    )
                }

            </InfoSection>

        </Section>
    );
}