import { useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import InfoSection from "../../components/ui/InfoSection/InfoSection";
import InfoRow from "../../components/ui/InfoRow/InfoRow";

import { getPlaygroundById } from "../../utils/playgrounds";

import {
    getPlaygroundSizeName,
    getSurfaceName,
    getAmenitiesList,
    getEquipmentName,
} from "../../utils/playgrounds";

import { events } from "../../data/events";

import { getPlaygroundEvents } from "../../utils/playgroundEvents";

import {
    getYandexMapsUrl,
} from "../../utils/maps";

import { Link } from "react-router-dom";

export default function PlaygroundDetails() {
    const { id } = useParams();

    const playground = id
        ? getPlaygroundById(id)
        : undefined;

    if (!playground) {
        return (
            <Section title="Площадка">
                <p>Площадка не найдена.</p>
            </Section>
        );
    }

    const playgroundEvents =
    getPlaygroundEvents(
        events,
        playground.id
    );

    const amenities =
    getAmenitiesList(
        playground.amenities
    );

    const equipment =
    playground.equipment.map(
        getEquipmentName
    );

    return (
        <Section title={playground.name}>
            <InfoSection title="Основная информация">
                <InfoRow label="Населённый пункт">
                    {playground.locality}
                </InfoRow>

                <InfoRow label="Адрес">
                    {playground.address}
                </InfoRow>

                <InfoRow label="Координаты">
                    {playground.coordinates.latitude.toFixed(6)}
                    {" , "}
                    {playground.coordinates.longitude.toFixed(6)}
                </InfoRow>

                <InfoRow label="Карта">
                    <a
                        href={getYandexMapsUrl(
                            playground.coordinates.latitude,
                            playground.coordinates.longitude
                        )}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Открыть в Яндекс Картах
                    </a>
                </InfoRow>

                <InfoRow label="Время работы">
                    {playground.openingHours}
                </InfoRow>

                <InfoRow label="Размер">
                    {getPlaygroundSizeName(playground.size)}
                </InfoRow>

                <InfoRow label="Покрытие">
                    {getSurfaceName(playground.surface)}
                </InfoRow>
            </InfoSection>

            <InfoSection title="Удобства">
                {
                    amenities.length === 0 ? (
                        <p>
                            Удобства не указаны.
                        </p>
                    ) : (
                        <ul>
                            {
                                amenities.map(
                                    (amenity) => (
                                        <li key={amenity}>
                                            {amenity}
                                        </li>
                                    )
                                )
                            }
                        </ul>
                    )
                }
            </InfoSection>
                
            <InfoSection title="Оборудование">
                {
                    equipment.length === 0 ? (
                        <p>
                            Оборудование не указано.
                        </p>
                    ) : (
                        <ul>
                            {
                                equipment.map(
                                    (item) => (
                                        <li key={item}>
                                            {item}
                                        </li>
                                    )
                                )
                            }
                        </ul>
                    )
                }    
            </InfoSection>

            <InfoSection title="Предстоящие события">
                {
                    playgroundEvents.length === 0 ? (
                        <p>
                            Для этой площадки пока нет событий.
                        </p>
                    ) : (
                        <ul>
                            {
                                playgroundEvents.map(
                                    (event) => (
                                        <li key={event.id}>
                                            <Link to={`/events/${event.id}`}>
                                                {event.title}
                                            </Link>
                                        </li>
                                    )
                                )
                            }
                        </ul>
                    )
                }
            </InfoSection>    

        </Section>
    );
}