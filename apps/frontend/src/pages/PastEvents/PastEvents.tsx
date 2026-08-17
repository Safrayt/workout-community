import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import Pagination from "../../components/ui/Pagination/Pagination";

import EventCardConnected from "../../components/EventCardConnected/EventCardConnected";

import "../../styles/components/events-list.css";

import {
    useEvents,
} from "../../context/EventContext";

import {
    useRegistration,
} from "../../context/RegistrationContext";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import { useUserDirectory } from "../../hooks/useUserDirectory";

import {
    getCreatedEvents,
    getUserEvents,
    sortEventsDescending,
} from "../../utils/events";

import { isCompletedEvent } from "../../utils/eventStatus";

import { paginate, getTotalPages } from "../../utils/pagination";

type Role = "organizer" | "participant";

const roleLabels: Record<Role, string> = {
    organizer: "организатор",
    participant: "участник",
};

/**
 * Обслуживает оба маршрута с одинаковой структурой пути:
 * - /profile/events/past/:role — свои прошедшие события;
 * - /u/:username/events/past/:role — прошедшие события другого
 *   пользователя.
 *
 * Приватность действует только на role="participant" чужой
 * страницы: организованные события открыты всегда (они и так
 * видны в общем каталоге /events), а вот участие в чужих событиях
 * скрывает переключатель "События" в настройках приватности.
 */
export default function PastEvents() {
    const { role, username } = useParams<{
        role: Role;
        username?: string;
    }>();

    const {
        currentUser,
    } = useCurrentUser();

    const { getUserByUsername } = useUserDirectory();

    const {
        events,
    } = useEvents();

    const {
        registrations,
    } = useRegistration();

    const [page, setPage] = useState(1);

    const targetUser = username
        ? getUserByUsername(username)
        : currentUser;

    const isOwnProfile = targetUser?.id === currentUser.id;

    const effectiveRole: Role = role ?? "organizer";

    if (!targetUser) {
        return (
            <Section title="Прошедшие события">
                <div className="events-empty-state">
                    <p className="events-empty-state__title">
                        Пользователь @{username} не найден.
                    </p>
                </div>
            </Section>
        );
    }

    const isPrivateParticipantView =
        effectiveRole === "participant" &&
        !isOwnProfile &&
        !targetUser.privacySettings.eventsVisible;

    if (isPrivateParticipantView) {
        return (
            <Section
                title={`Прошедшие события — ${targetUser.nickname} (участник)`}
            >
                <div className="events-empty-state">
                    <p className="events-empty-state__title">
                        Этот пользователь закрыл участие в событиях от посторонних.
                    </p>

                    <Link to={`/u/${targetUser.nickname}/events`}>
                        <Button variant="secondary">
                            Назад к событиям
                        </Button>
                    </Link>
                </div>
            </Section>
        );
    }

    const isOrganizer = effectiveRole === "organizer";

    const roleEvents = isOrganizer
        ? getCreatedEvents(events, targetUser.id)
        : getUserEvents(
            events,
            registrations,
            targetUser.id
        ).filter(
            (event) => event.creatorId !== targetUser.id
        );

    const pastEvents = sortEventsDescending(
        roleEvents.filter(isCompletedEvent)
    );

    const totalPages = getTotalPages(pastEvents.length);

    const pageEvents = paginate(pastEvents, page);

    const backHref = username
        ? `/u/${targetUser.nickname}/events`
        : "/profile/events";

    const backLabel = username
        ? "← Назад к событиям"
        : "← Назад к моим событиям";

    const title = username
        ? `Прошедшие события — ${targetUser.nickname} (${roleLabels[effectiveRole]})`
        : `Прошедшие события — ${roleLabels[effectiveRole]}`;

    return (
        <Section title={title}>
            <Link to={backHref} className="events-back-link">
                {backLabel}
            </Link>

            {
                pastEvents.length === 0 ? (
                    <div className="events-empty-state">
                        <p className="events-empty-state__title">
                            Прошедших событий пока нет.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="events-list">
                            {
                                pageEvents.map((event) => (
                                    <EventCardConnected
                                        key={event.id}
                                        event={event}
                                    />
                                ))
                            }
                        </div>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </>
                )
            }
        </Section>
    );
}
