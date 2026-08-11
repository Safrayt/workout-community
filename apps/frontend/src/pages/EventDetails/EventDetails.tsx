import { useNavigate, useParams } from "react-router-dom";

import "../../styles/components/event-details.css";

import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";

import {
    useEvents,
} from "../../context/EventContext";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import { getPlaygroundById } from "../../utils/playgrounds";
import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import InfoSection from "../../components/ui/InfoSection/InfoSection";
import {
    getEventById,
} from "../../utils/events";

import {
    getEventStatus,
} from "../../utils/eventStatus";

import {
    useRegistration,
} from "../../context/RegistrationContext";

import {
    getEventRegistrations,
} from "../../utils/eventRegistrations";

import EventParticipants from "../../components/EventParticipants/EventParticipants";
import EventInfo from "../../components/EventInfo/EventInfo";
import EventHero from "../../components/EventHero/EventHero";
import EventQuickFacts from "../../components/EventQuickFacts/EventQuickFacts";
import EventWeather from "../../components/EventWeather/EventWeather";
import EventPlaygroundPreview from "../../components/EventPlaygroundPreview/EventPlaygroundPreview";
import EventStickyAction from "../../components/EventStickyAction/EventStickyAction";
import EventNotFound from "../../components/EventNotFound/EventNotFound";


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
            <EventNotFound />
        );
    }

    const isOwner =
        event.creatorId === currentUser.id;

    const isUpcoming =
        getEventStatus(event) === "upcoming";

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
        <div
            className={
                isUpcoming
                    ? "event-details event-details--with-sticky-action"
                    : "event-details"
            }
        >

            {/* 1. Event Hero — название, дата/время, статус, "Хочу участвовать" (шаг 1, UX §7) */}
            <EventHero
                event={event}
            />

            {/* 2. Quick Facts — дата, время, площадка, участники, без лимитов (шаг 2, UX §10) */}
            <EventQuickFacts
                event={event}
                playground={playground}
                participantsCount={participantsCount}
            />

            {/* 3. Weather-блок — прогноз к моменту начала тренировки (шаг 4, UX §14–17) */}
            <EventWeather
                startDate={event.startDate}
                coordinates={playground?.coordinates}
            />

            {/* 4. Описание события — скрывается, если пусто (UX §18–19, §40) */}
            <EventInfo
                event={event}
            />

            {/* 5. Playground Preview — компактная карточка (UX §20–22) */}
            <EventPlaygroundPreview
                playground={playground}
            />

            {/* 6. Участники — создатель закреплён первым и помечен бейджем */}
            <InfoSection title="Участники">

                <EventParticipants
                    participants={
                        participants
                    }
                    creatorId={
                        event.creatorId
                    }
                />

            </InfoSection>

            {
                isOwner && isUpcoming && (
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

            {/* Sticky bottom action на мобильном (UX §32); скрыт для завершённых событий через isUpcoming */}
            {
                isUpcoming && (
                    <EventStickyAction
                        eventId={event.id}
                        participantsCount={participantsCount}
                    />
                )
            }

        </div>
    );
}