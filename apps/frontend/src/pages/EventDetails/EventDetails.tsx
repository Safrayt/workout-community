import { useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";

import { events } from "../../data/events";

import { formatEventDate } from "../../utils/formatEventDate";
import { formatParticipants } from "../../utils/format";

import { getPlaygroundById } from "../../utils/playgrounds";

import { Link } from "react-router-dom";

import InfoSection from "../../components/ui/InfoSection/InfoSection";
import InfoRow from "../../components/ui/InfoRow/InfoRow";
import {
    getEventById,
    getRegisteredParticipantsCount,
} from "../../utils/events";

import {
    useRegistration,
} from "../../context/RegistrationContext";


export default function EventDetails() {
    const { id } = useParams();

    const event =
    id
        ? getEventById(
            events,
            id
        )
        : undefined;

    if (!event) {
        return (
            <Section title="Событие">
                <p>Событие не найдено.</p>
            </Section>
        );
    }

     const playground =
    getPlaygroundById(
        event.playgroundId
    );

    const {
        registrations,
    } = useRegistration();

    const participantsCount =
    getRegisteredParticipantsCount(
        registrations,
        event.id
    );

    return (
        <Section title={event.title}>
            <InfoSection title="Основная информация">

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
                    {formatEventDate(event.startDate)}
                </InfoRow>

                <InfoRow label="Погода">
                    {event.weather ?? "—"}
                </InfoRow>

            </InfoSection>

            <InfoSection title="Участники">

                <InfoRow label="Записалось">
                    {formatParticipants(participantsCount)}
                </InfoRow>

            </InfoSection>

            <InfoSection title="Место проведения">

                {
                    playground ? (
                        <Link
                            to={`/playgrounds/${playground.id}`}
                        >
                            Открыть страницу площадки
                        </Link>
                    ) : (
                        <p>
                            Площадка не найдена.
                        </p>
                    )
                }

            </InfoSection>

        </Section>
    );
}