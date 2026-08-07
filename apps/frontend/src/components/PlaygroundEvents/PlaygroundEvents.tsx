import type {
    Event,
} from "../../types/event";

import type {
    EventRegistration,
} from "../../types/eventRegistration";

import InfoSection from "../ui/InfoSection/InfoSection";

import EventSummary from "../EventSummary/EventSummary";

type Props = {

    events: Event[];

    registrations: EventRegistration[];

};

export default function PlaygroundEvents({

    events,

    registrations,

}: Props) {

    if (
        events.length === 0
    ) {

        return (

            <InfoSection
                title="Все мероприятия"
            >

                <p>
                    На этой площадке пока нет мероприятий.
                </p>

            </InfoSection>

        );

    }

    return (

        <InfoSection
            title="Все мероприятия"
        >

            <div>

                {
                    events.map(
                        (event) => (

                            <EventSummary

                                key={event.id}

                                event={event}

                                registrations={registrations}

                            />

                        )
                    )
                }

            </div>

        </InfoSection>

    );

}