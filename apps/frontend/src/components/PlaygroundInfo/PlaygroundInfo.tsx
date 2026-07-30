import type {
    Playground,
} from "../../types/playground";

import {
    playgroundSizes,
    playgroundSurfaces,
} from "../../constants/playgroundProperties";

import InfoSection from "../ui/InfoSection/InfoSection";
import InfoRow from "../ui/InfoRow/InfoRow";

type Props = {

    playground: Playground;

};

export default function PlaygroundInfo({
    playground,
}: Props) {

    return (

        <InfoSection
            title="Основная информация"
        >

            {
                playground.description && (

                    <p>
                        {playground.description}
                    </p>

                )
            }

            <InfoRow label="Населённый пункт">
                {playground.locality}
            </InfoRow>

            <InfoRow label="Адрес">
                {playground.address}
            </InfoRow>

            <InfoRow label="Размер">
                {
                    playgroundSizes[
                        playground.size
                    ]
                }
            </InfoRow>

            <InfoRow label="Покрытие">
                {
                    playgroundSurfaces[
                        playground.surface
                    ]
                }
            </InfoRow>

            <InfoRow label="Время работы">
                {playground.openingHours}
            </InfoRow>

        </InfoSection>

    );

}