import EventCard from "../EventCard/EventCard";

import {
    useRegistration,
} from "../../context/RegistrationContext";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    getParticipantCount,
} from "../../utils/eventParticipants";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

import type { Event } from "../../types/event";

type EventCardConnectedProps = {
    event: Event;
};

/**
 * Тонкая обёртка над EventCard: сама достаёт число участников,
 * площадку и статус регистрации из контекста. Нужна, чтобы не
 * дублировать эту логику в каждом месте, где рендерится список
 * событий пользователя (MyEvents, PastEvents).
 */
export default function EventCardConnected({
    event,
}: EventCardConnectedProps) {
    const {
        registrations,
        register,
        cancel,
        checkRegistration,
    } = useRegistration();

    const {
        playgrounds,
    } = usePlaygrounds();

    const participants = getParticipantCount(
        registrations,
        event.id
    );

    const registered = checkRegistration(event.id);

    const playground = getPlaygroundById(
        playgrounds,
        event.playgroundId
    );

    return (
        <EventCard
            {...event}
            playground={playground}
            expectedParticipants={participants}
            isRegistered={registered}
            onRegister={() => register(event.id)}
            onCancelRegistration={() => cancel(event.id)}
        />
    );
}
