import type {
    Playground,
} from "../../types/playground";

import "../../styles/components/playground-equipment.css";

import InfoSection from "../ui/InfoSection/InfoSection";

import {
    equipmentCategoryLabels,
    playgroundEquipment,
    type PlaygroundEquipmentCategory,
} from "../../constants/playgroundEquipment";

type Props = {

    playground: Playground;

};

const categoryOrder: PlaygroundEquipmentCategory[] = [
    "pullBars",
    "parallelBars",
    "pushBars",
    "climbing",
    "accessories",
];

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

            <div className="playground-equipment">

                {
                    categoryOrder.map((category) => {

                        const itemsInCategory = playground.equipment.filter(
                            (item) => playgroundEquipment[item].category === category
                        );

                        if (itemsInCategory.length === 0) {
                            return null;
                        }

                        return (
                            <div
                                key={category}
                                className="playground-equipment__group"
                            >
                                <h4 className="playground-equipment__group-title">
                                    {equipmentCategoryLabels[category]}
                                </h4>

                                <div className="playground-equipment__grid">
                                    {
                                        itemsInCategory.map((item) => {

                                            const info = playgroundEquipment[item];

                                            return (
                                                <div
                                                    key={item}
                                                    className="playground-equipment__item"
                                                    title={info.name}
                                                >
                                                    <span className="playground-equipment__icon">
                                                        {info.icon}
                                                    </span>

                                                    <span className="playground-equipment__name">
                                                        {info.name}
                                                    </span>
                                                </div>
                                            );

                                        })
                                    }
                                </div>
                            </div>
                        );

                    })
                }

            </div>

        </InfoSection>

    );

}
