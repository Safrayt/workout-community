import InfoRow from "../ui/InfoRow/InfoRow";

import {
    useEventWeather,
} from "../../hooks/useEventWeather";

import {
    formatEventWeather,
} from "../../utils/formatEventWeather";

import type {
    PlaygroundCoordinates,
} from "../../types/playground";

type Props = {

    startDate: string;

    coordinates?: PlaygroundCoordinates;

};

export default function EventWeather({
    startDate,
    coordinates,
}: Props) {

    const state = useEventWeather(
        startDate,
        coordinates?.latitude,
        coordinates?.longitude
    );

    return (
        <InfoRow label="Погода">
            {formatEventWeather(state)}
        </InfoRow>
    );
}