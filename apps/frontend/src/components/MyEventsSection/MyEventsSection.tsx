import { Link } from "react-router-dom";

import InfoSection from "../ui/InfoSection/InfoSection";
import Button from "../ui/Button/Button";

import EventCardConnected from "../EventCardConnected/EventCardConnected";

import "../../styles/components/my-events-section.css";

import { pluralizeRu } from "../../utils/pluralize";

import type { Event } from "../../types/event";

type MyEventsSectionProps = {
    title: string;

    upcomingEvents: Event[];

    pastEventsCount: number;

    /** Ссылка на отдельную страницу со всеми прошедшими событиями этой роли. */
    pastEventsHref: string;

    emptyUpcomingText: string;

    emptyUpcomingCta: {
        to: string;
        label: string;
    };
};

/**
 * Прошедших событий может накопиться много, поэтому здесь не
 * список, а сводка с переходом на отдельную страницу с пагинацией
 * (PastEvents) — страница "Мои события" не разрастается.
 */
export default function MyEventsSection({
    title,
    upcomingEvents,
    pastEventsCount,
    pastEventsHref,
    emptyUpcomingText,
    emptyUpcomingCta,
}: MyEventsSectionProps) {
    return (
        <InfoSection
            title={title}
            className="my-events-section"
        >
            <h4 className="my-events-subheading">
                Предстоящие события
            </h4>

            {
                upcomingEvents.length === 0 ? (
                    <div className="events-empty-state">
                        <p className="events-empty-state__title">
                            {emptyUpcomingText}
                        </p>

                        <Link to={emptyUpcomingCta.to}>
                            <Button variant="secondary">
                                {emptyUpcomingCta.label}
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="events-list">
                        {
                            upcomingEvents.map((event) => (
                                <EventCardConnected
                                    key={event.id}
                                    event={event}
                                />
                            ))
                        }
                    </div>
                )
            }

            <h4 className="my-events-subheading my-events-subheading--past">
                Прошедшие события
            </h4>

            {
                pastEventsCount === 0 ? (
                    <p className="my-events-past-empty">
                        Прошедших событий пока нет.
                    </p>
                ) : (
                    <div className="my-events-past-summary">
                        <span>
                            {pastEventsCount} {
                                pluralizeRu(
                                    pastEventsCount,
                                    ["прошедшее событие", "прошедших события", "прошедших событий"]
                                )
                            }
                        </span>

                        <Link to={pastEventsHref}>
                            <Button variant="secondary">
                                Смотреть прошедшие
                            </Button>
                        </Link>
                    </div>
                )
            }
        </InfoSection>
    );
}
