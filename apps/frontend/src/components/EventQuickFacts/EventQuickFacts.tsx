import "../../styles/components/event-quick-facts.css";

import type {
    Event,
} from "../../types/event";

import type {
    Playground,
} from "../../types/playground";

import {
    formatEventDateLong,
    formatEventTime,
} from "../../utils/formatEventDate";

import {
    formatParticipants,
} from "../../utils/format";

type Props = {

    event: Event;

    playground?: Playground;

    participantsCount: number;

};

/**
 * Блок "на первый взгляд" под Hero (UX-спецификация, §10).
 *
 * Дата, населённый пункт, время, площадка и число желающих участвовать — без
 * capacity и лимитов (§13): у события нет мест, поэтому здесь
 * никогда не должно быть вида "18 / 30" или "осталось мест".
 */
export default function EventQuickFacts({
    event,
    playground,
    participantsCount,
}: Props) {

    return (

        <ul className="event-quick-facts">

            <li className="event-quick-facts__item">
                <span className="event-quick-facts__label">
                    Дата
                </span>

                <span className="event-quick-facts__value">
                    {formatEventDateLong(event.startDate)}
                </span>
            </li>

            <li className="event-quick-facts__item">
                <span className="event-quick-facts__label">
                    Населённый пункт
                </span>

                <span className="event-quick-facts__value">
                    {
                        playground
                            ? playground.locality
                            : "—"
                    }
                </span>
            </li>

            <li className="event-quick-facts__item">
                <span className="event-quick-facts__label">
                    Время
                </span>

                <span className="event-quick-facts__value">
                    {formatEventTime(event.startDate)}
                </span>
            </li>

            <li className="event-quick-facts__item">
                <span className="event-quick-facts__label">
                    Место
                </span>

                <span className="event-quick-facts__value">
                    {
                        playground
                            ? playground.name
                            : "—"
                    }
                </span>
            </li>

            <li className="event-quick-facts__item">
                <span className="event-quick-facts__label">
                    Участники
                </span>

                <span className="event-quick-facts__value">
                    {formatParticipants(participantsCount)}
                </span>
            </li>

        </ul>

    );

}
