import type {
    Playground,
} from "../../types/playground";

import "../../styles/components/playground-amenities.css";

import InfoSection from "../ui/InfoSection/InfoSection";

import {
    playgroundAmenityIcons,
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

            <div className="playground-amenities">

                {
                    availableAmenities.map(
                        ([key, label]) => (

                            <span
                                key={key}
                                className="playground-amenities__badge"
                            >
                                <span className="playground-amenities__icon">
                                    {playgroundAmenityIcons[key]}
                                </span>

                                {label}
                            </span>

                        )
                    )
                }

            </div>

        </InfoSection>

    );

}
