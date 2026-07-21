import { useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import InfoSection from "../../components/ui/InfoSection/InfoSection";

import { getPlaygroundById } from "../../utils/playgrounds";

import {
    getPlaygroundSizeName,
    getSurfaceName,
    getAmenitiesList,
    getEquipmentName,
} from "../../utils/playgrounds";

import { events } from "../../data/events";

import { getPlaygroundEvents } from "../../utils/playgroundEvents";

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
            <p>
                <strong>Населённый пункт:</strong>{" "}
                {playground.locality}
            </p>

            <p>
                <strong>Адрес:</strong>{" "}
                {playground.address}
            </p>

            <p>
                <strong>Время работы:</strong>{" "}
                {playground.openingHours}
            </p>

            <p>
                <strong>Размер:</strong>{" "}
                {getPlaygroundSizeName(playground.size)}
            </p>

            <p>
                <strong>Покрытие:</strong>{" "}
                {getSurfaceName(playground.surface)}
            </p>

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
                
            <h3>Оборудование</h3>
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


            <h3>Предстоящие события</h3>
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

        </Section>
    );
}