import Section from "../../components/ui/Section/Section";
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
 * "Мои события" (/profile/events) — то, куда ведёт кнопка "Все
 * события" из превью в профиле. В отличие от общего списка
 * /events, здесь только события, связанные с текущим
 * пользователем, с чётким делением на роль (организатор или
 * участник) и статус (предстоящие / прошедшие). Прошедшие события
 * на этой странице не перечисляются — их может быть много, поэтому
 * для них отдельная страница с пагинацией (PastEvents).
 */
export default function MyEvents() {
    const {
        currentUser,
    } = useCurrentUser();

    const {
        events,
    } = useEvents();

    const {
        registrations,
    } = useRegistration();

    const organizedEvents = getCreatedEvents(
        events,
        currentUser.id
    );

    const registeredEvents = getUserEvents(
        events,
        registrations,
        currentUser.id
    );

    // Событие, которое пользователь и создал, и посетил как
    // участник, показываем один раз — в разделе "Организатор".
    const participatedEvents = registeredEvents.filter(
        (event) => event.creatorId !== currentUser.id
    );

    const organizedUpcoming = sortEventsAscending(
        organizedEvents.filter(isUpcomingEvent)
    );

    const organizedPastCount = organizedEvents.filter(
        isCompletedEvent
    ).length;

    const participatedUpcoming = sortEventsAscending(
        participatedEvents.filter(isUpcomingEvent)
    );

    const participatedPastCount = participatedEvents.filter(
        isCompletedEvent
    ).length;

    return (
        <Section title="Мои события">
            <MyEventsSection
                title="Организатор"
                upcomingEvents={organizedUpcoming}
                pastEventsCount={organizedPastCount}
                pastEventsHref="/profile/events/past/organizer"
                emptyUpcomingText="Ты ещё не создавал общих тренировок."
                emptyUpcomingCta={{
                    to: "/events/create",
                    label: "Создать событие",
                }}
            />

            <MyEventsSection
                title="Участник"
                upcomingEvents={participatedUpcoming}
                pastEventsCount={participatedPastCount}
                pastEventsHref="/profile/events/past/participant"
                emptyUpcomingText="Пока нет предстоящих событий, в которых ты участвуешь."
                emptyUpcomingCta={{
                    to: "/events",
                    label: "Найти событие",
                }}
            />
        </Section>
    );
}
