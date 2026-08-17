import { Link, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import InfoSection from "../../components/ui/InfoSection/InfoSection";
import MyEventsSection from "../../components/MyEventsSection/MyEventsSection";

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
    sortEventsAscending,
} from "../../utils/events";

import {
    isUpcomingEvent,
    isCompletedEvent,
} from "../../utils/eventStatus";

/**
 * /u/:username/events — куда ведёт кнопка "Все события" с чужого
 * профиля. Раздел "Организатор" виден всегда — какие события
 * человек создал, и так открыто в общем каталоге /events. А вот
 * раздел "Участник" (в каких событиях человек участвует) — более
 * личная информация, поэтому именно её скрывает переключатель
 * "События" в настройках приватности.
 */
export default function UserEvents() {
    const { username } = useParams();

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

    const user = username
        ? getUserByUsername(username)
        : undefined;

    const isOwnProfile = user?.id === currentUser.id;

    if (!user) {
        return (
            <Section title="События">
                <div className="profile-empty">
                    <p>
                        Пользователь @{username} не найден.
                    </p>
                </div>
            </Section>
        );
    }

    const canViewParticipant =
        isOwnProfile || user.privacySettings.eventsVisible;

    const organizedEvents = getCreatedEvents(
        events,
        user.id
    );

    const organizedUpcoming = sortEventsAscending(
        organizedEvents.filter(isUpcomingEvent)
    );

    const organizedPastCount = organizedEvents.filter(
        isCompletedEvent
    ).length;

    const registeredEvents = getUserEvents(
        events,
        registrations,
        user.id
    );

    const participatedEvents = registeredEvents.filter(
        (event) => event.creatorId !== user.id
    );

    const participatedUpcoming = sortEventsAscending(
        participatedEvents.filter(isUpcomingEvent)
    );

    const participatedPastCount = participatedEvents.filter(
        isCompletedEvent
    ).length;

    return (
        <Section title={`События — ${user.nickname}`}>
            <Link
                to={`/u/${user.nickname}`}
                className="events-back-link"
            >
                ← Назад к профилю
            </Link>

            <MyEventsSection
                title="Организатор"
                upcomingEvents={organizedUpcoming}
                pastEventsCount={organizedPastCount}
                pastEventsHref={`/u/${user.nickname}/events/past/organizer`}
                emptyUpcomingText="Пользователь пока не создавал общих тренировок."
                emptyUpcomingCta={{
                    to: "/events",
                    label: "Смотреть все события",
                }}
            />

            {
                canViewParticipant ? (
                    <MyEventsSection
                        title="Участник"
                        upcomingEvents={participatedUpcoming}
                        pastEventsCount={participatedPastCount}
                        pastEventsHref={`/u/${user.nickname}/events/past/participant`}
                        emptyUpcomingText="Пользователь пока не участвовал в предстоящих событиях."
                        emptyUpcomingCta={{
                            to: "/events",
                            label: "Смотреть все события",
                        }}
                    />
                ) : (
                    <InfoSection
                        title="Участник"
                        className="my-events-section"
                    >
                        <div className="profile-empty">
                            <p>
                                Пользователь закрыл участие в событиях от
                                посторонних.
                            </p>
                        </div>
                    </InfoSection>
                )
            }
        </Section>
    );
}
