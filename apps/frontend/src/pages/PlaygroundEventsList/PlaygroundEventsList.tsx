import { Link, useParams } from "react-router-dom";

import "../../styles/components/playground-events-list.css";

import Section from "../../components/ui/Section/Section";
import EventSummary from "../../components/EventSummary/EventSummary";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    useEvents,
} from "../../context/EventContext";

import {
    useRegistration,
} from "../../context/RegistrationContext";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

import {
    getPlaygroundEvents,
} from "../../utils/playgroundEvents";

/**
 * Все мероприятия площадки — планируемые и уже проведённые,
 * от новых к старым. Полный список, в отличие от компактной
 * витрины "Ближайшие мероприятия" на странице площадки.
 */
export default function PlaygroundEventsList() {

    const { id } = useParams();

    const { playgrounds } = usePlaygrounds();
    const { events } = useEvents();
    const { registrations } = useRegistration();

    const playground =
        id
            ? getPlaygroundById(playgrounds, id)
            : undefined;

    if (!playground) {

        return (
            <Section title="Мероприятия">
                <p>
                    Площадка не найдена.
                </p>
            </Section>
        );

    }

    const playgroundEvents = getPlaygroundEvents(
        events,
        playground.id
    ).sort(
        (a, b) =>
            new Date(b.startDate).getTime() -
            new Date(a.startDate).getTime()
    );

    return (

        <Section title={`Мероприятия: ${playground.name}`}>

            <Link
                to={`/playgrounds/${playground.id}`}
                className="playground-events-list__back"
            >
                ← Назад к площадке
            </Link>

            {
                playgroundEvents.length === 0

                    ? (

                        <p>
                            На этой площадке пока нет мероприятий.
                        </p>

                    )

                    : (

                        <div className="playground-events-list">

                            {
                                playgroundEvents.map((event) => (

                                    <EventSummary
                                        key={event.id}
                                        event={event}
                                        registrations={registrations}
                                    />

                                ))
                            }

                        </div>

                    )
            }

        </Section>

    );

}
