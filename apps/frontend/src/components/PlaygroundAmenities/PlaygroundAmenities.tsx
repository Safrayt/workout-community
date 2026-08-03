import type {
    Playground,
} from "../../types/playground";

import InfoSection from "../ui/InfoSection/InfoSection";

import {
    playgroundAmenityLabels,
} from "../../constants/playgroundAmenities";

type Props = {

    playground: Playground;

};

export default function PlaygroundAmenities({
    playground,
}: Props) {

    const availableAmenities = (
        Object.entries(playgroundAmenityLabels) as [
            keyof typeof playgroundAmenityLabels,
            string,
        ][]
    ).filter(
        ([key]) => playground.amenities[key]
    );

    if (
        availableAmenities.length === 0
    ) {

        return (

            <InfoSection
                title="Удобства"
            >

                <p>
                    Информация отсутствует.
                </p>

            </InfoSection>

        );

    }

    return (

        <InfoSection
            title="Удобства"
        >

            <ul>

                {
                    availableAmenities.map(
                        ([key, label]) => (

                            <li
                                key={key}
                            >
                                {label}
                            </li>

                        )
                    )
                }

            </ul>

        </InfoSection>

    );

}