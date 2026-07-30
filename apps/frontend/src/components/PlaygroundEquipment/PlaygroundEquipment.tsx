import type {
    Playground,
} from "../../types/playground";

import InfoSection from "../ui/InfoSection/InfoSection";

import {
    playgroundEquipment,
} from "../../constants/playgroundEquipment";

type Props = {

    playground: Playground;

};

export default function PlaygroundEquipment({
    playground,
}: Props) {

    if (
        playground.equipment.length === 0
    ) {

        return (

            <InfoSection
                title="Оборудование"
            >

                <p>
                    Информация отсутствует.
                </p>

            </InfoSection>

        );

    }

    return (

        <InfoSection
            title="Оборудование"
        >

            <ul>

                {
                    playground.equipment.map(
                        (equipment) => {

                            const info =
                                playgroundEquipment[
                                    equipment
                                ];

                            return (

                                <li
                                    key={equipment}
                                >

                                    {info.icon}

                                    {" "}

                                    {info.name}

                                </li>

                            );

                        }
                    )
                }

            </ul>

        </InfoSection>

    );

}