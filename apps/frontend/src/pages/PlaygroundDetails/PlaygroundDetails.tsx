import { useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";

import PlaygroundInfo from "../../components/PlaygroundInfo/PlaygroundInfo";
import PlaygroundAmenities from "../../components/PlaygroundAmenities/PlaygroundAmenities";
import PlaygroundEquipment from "../../components/PlaygroundEquipment/PlaygroundEquipment";
import PlaygroundEvents from "../../components/PlaygroundEvents/PlaygroundEvents";

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

export default function PlaygroundDetails() {

    const { id } = useParams();

    const {
        playgrounds,
    } = usePlaygrounds();

    const {
        events,
    } = useEvents();

    const {
        registrations,
    } = useRegistration();

    const playground =
        id
            ? getPlaygroundById(
                playgrounds,
                id
            )
            : undefined;

    if (!playground) {

        return (
            <Section title="Площадка">

                <p>
                    Площадка не найдена.
                </p>

            </Section>
        );

    }

    const playgroundEvents =
        getPlaygroundEvents(
            events,
            playground.id
        );

    return (

        <Section title={playground.name}>

            <PlaygroundInfo
                playground={playground}
            />

            <PlaygroundAmenities
                playground={playground}
            />

            <PlaygroundEquipment
                playground={playground}
            />

            <PlaygroundEvents
                events={playgroundEvents}
                registrations={registrations}
            />

        </Section>

    );

}