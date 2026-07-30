import type {
    Playground,
} from "../../types/playground";

import InfoSection from "../ui/InfoSection/InfoSection";

type Props = {

    playground: Playground;

};

export default function PlaygroundAmenities({
    playground,
}: Props) {

    const amenities = [

        {
            key: "lighting",
            label: "Освещение",
            enabled:
                playground.amenities.lighting,
        },

        {
            key: "covered",
            label: "Навес",
            enabled:
                playground.amenities.covered,
        },

        {
            key: "changingRoom",
            label: "Раздевалка",
            enabled:
                playground.amenities.changingRoom,
        },

        {
            key: "toilet",
            label: "Туалет",
            enabled:
                playground.amenities.toilet,
        },

        {
            key: "drinkingWater",
            label: "Питьевая вода",
            enabled:
                playground.amenities.drinkingWater,
        },

        {
            key: "shower",
            label: "Душ",
            enabled:
                playground.amenities.shower,
        },

        {
            key: "parking",
            label: "Парковка",
            enabled:
                playground.amenities.parking,
        },

        {
            key: "bicycleParking",
            label: "Велопарковка",
            enabled:
                playground.amenities.bicycleParking,
        },

    ];

    const availableAmenities =
        amenities.filter(
            (item) =>
                item.enabled
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
                        (item) => (

                            <li
                                key={item.key}
                            >
                                {item.label}
                            </li>

                        )
                    )
                }

            </ul>

        </InfoSection>

    );

}