import "../../styles/components/event-sticky-action.css";

import EventRegistration from "../EventRegistration/EventRegistration";

import {
    pluralizeRu,
} from "../../utils/pluralize";

type Props = {

    eventId: string;

    participantsCount: number;

};

/**
 * Sticky bottom action на мобильном (UX §32). На десктопе скрыт
 * через CSS — там основное действие уже доступно в Hero.
 *
 * Рендерится тем же `EventRegistration`, что и в Hero: оба места
 * читают состояние из одного `RegistrationContext`, поэтому кнопки
 * всегда синхронны, независимо от того, через какую из них
 * пользователь нажал.
 */
export default function EventStickyAction({
    eventId,
    participantsCount,
}: Props) {

    return (

        <div className="event-sticky-action">

            <span className="event-sticky-action__count">
                {`${participantsCount} ${pluralizeRu(participantsCount, ["человек", "человека", "человек"])} ${pluralizeRu(participantsCount, ["хочет", "хотят", "хотят"])} участвовать`}
            </span>

            <EventRegistration
                eventId={eventId}
            />

        </div>

    );
}
