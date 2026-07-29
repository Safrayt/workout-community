import type {
    Event,
} from "../../types/event";

import type {
    Playground,
} from "../../types/playground";

import InfoSection from "../ui/InfoSection/InfoSection";
import InfoRow from "../ui/InfoRow/InfoRow";

import {
    formatEventDate,
} from "../../utils/formatEventDate";

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

            <p>
                {event.description}
            </p>

            <InfoRow label="Населённый пункт">
                {playground?.locality ?? "—"}
            </InfoRow>

            <InfoRow label="Площадка">
                {playground?.name ?? "—"}
            </InfoRow>

            <InfoRow label="Адрес">
                {playground?.address ?? "—"}
            </InfoRow>

            <InfoRow label="Дата">
                {formatEventDate(
                    event.startDate
                )}
            </InfoRow>

            <InfoRow label="Погода">
                {event.weather ?? "—"}
            </InfoRow>

        </InfoSection>

    );

}