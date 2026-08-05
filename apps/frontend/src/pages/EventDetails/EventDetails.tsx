import { useNavigate, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";

import {
    useEvents,
} from "../../context/EventContext";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import { formatParticipants } from "../../utils/format";

import { getPlaygroundById } from "../../utils/playgrounds";
import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import InfoSection from "../../components/ui/InfoSection/InfoSection";
import InfoRow from "../../components/ui/InfoRow/InfoRow";
import {
    getEventById,
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
import EventPoster from "../../components/EventPoster/EventPoster";


export default function EventDetails() {
    const { id } = useParams();

    const navigate = useNavigate();

    const {
        events,
        deleteEvent,
    } = useEvents();

    const {
        currentUser,
    } = useCurrentUser();

    const {
        playgrounds,
    } = usePlaygrounds();

    const {
        registrations,
    } = useRegistration();

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

    const isOwner =
        event.creatorId === currentUser.id;

    function handleDelete() {
        if (!event) {
            return;
        }

        const confirmed = window.confirm(
            `Удалить мероприятие «${event.title}»? Это действие необратимо.`
        );

        if (!confirmed) {
            return;
        }

        deleteEvent(event.id);

        navigate("/events");
    }

    const playground =
        getPlaygroundById(
            playgrounds,
            event.playgroundId
        );

    const participants =
        getEventRegistrations(
            registrations,
            event.id
        );

    const participantsCount =
        participants.length;

    return (
        <Section title={event.title}>
            <EventPoster
                event={event}
                playground={playground}
            />

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

            {
                isOwner && (
                    <ActionGroup>
                        <Button
                            variant="secondary"
                            onClick={() =>
                                navigate(`/events/${event.id}/edit`)
                            }
                        >
                            Изменить мероприятие
                        </Button>

                        <Button
                            variant="danger"
                            onClick={handleDelete}
                        >
                            Удалить мероприятие
                        </Button>
                    </ActionGroup>
                )
            }

        </Section>
    );
}