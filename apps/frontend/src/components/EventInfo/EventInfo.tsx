import type {
    Event,
} from "../../types/event";

import type {
    Playground,
} from "../../types/playground";

import { Link } from "react-router-dom";

import "../../styles/components/EventInfo.css";

import InfoSection from "../ui/InfoSection/InfoSection";
import InfoRow from "../ui/InfoRow/InfoRow";

import {
    formatEventDate,
} from "../../utils/formatEventDate";

import EventWeather from "../EventWeather/EventWeather";

type Props = {

    event: Event;

    playground?: Playground;

};

export default function EventInfo({
    event,
    playground,
}: Props) {

    return (

        <InfoSection
            title="Основная информация"
        >

            <p className="event-info__description">
                {event.description}
            </p>

            <InfoRow label="Населённый пункт">
                {playground?.locality ?? "—"}
            </InfoRow>

            <InfoRow label="Площадка">
                {
                    playground ? (
                        <Link
                            to={`/playgrounds/${playground.id}`}
                        >
                            {playground.name}
                        </Link>
                    ) : (
                        "—"
                    )
                }
            </InfoRow>

            <InfoRow label="Адрес">
                {playground?.address ?? "—"}
            </InfoRow>

            <InfoRow label="Дата">
                {formatEventDate(
                    event.startDate
                )}
            </InfoRow>

            <EventWeather
                startDate={event.startDate}
                coordinates={playground?.coordinates}
            />

        </InfoSection>

    );

}