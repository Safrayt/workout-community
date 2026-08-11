import type {
    Event,
} from "../../types/event";

import "../../styles/components/EventInfo.css";

import InfoSection from "../ui/InfoSection/InfoSection";

type Props = {

    event: Event;

};

/**
 * Описание события (UX §18–19). Площадка, дата и время сюда больше
 * не дублируются — они уже показаны в Hero, Quick Facts и
 * Playground Preview.
 */
export default function EventInfo({
    event,
}: Props) {

    if (event.description.trim().length === 0) {
        return null;
    }

    return (

        <InfoSection
            title="Описание"
            className="event-info-section"
        >

            <div className="event-info__card">
                <p className="event-info__description">
                    {event.description}
                </p>
            </div>

        </InfoSection>

    );

}
