import "../../styles/components/playground-access-note.css";

import type {
    Playground,
} from "../../types/playground";

import {
    playgroundAccessLabels,
    playgroundSizes,
    playgroundSurfaces,
} from "../../constants/playgroundProperties";

import InfoSection from "../ui/InfoSection/InfoSection";
import InfoRow from "../ui/InfoRow/InfoRow";
import ConditionBadge from "../ui/ConditionBadge/ConditionBadge";
import RatingBadge from "../ui/RatingBadge/RatingBadge";

import PlaygroundInspectionPrompt, {
    InspectionSummary,
} from "../PlaygroundInspection/PlaygroundInspection";

import { calculatePlaygroundRating } from "../../utils/playgroundRating";

type Props = {

    playground: Playground;

    onEdit: () => void;

};

export default function PlaygroundInfo({
    playground,
    onEdit,
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

            <InfoRow label="Доступ">
                {
                    playgroundAccessLabels[
                        playground.access
                    ]
                }
            </InfoRow>

            {
                playground.access === "limited" &&
                playground.accessRestrictions && (

                    <div className="playground-access-note">
                        <strong className="playground-access-note__title">
                            Ограничения доступа
                        </strong>

                        <p className="playground-access-note__text">
                            {playground.accessRestrictions}
                        </p>
                    </div>

                )
            }

            <InfoRow label="Время работы">
                {playground.openingHours}
            </InfoRow>

            <InfoRow label="Рейтинг">
                <RatingBadge rating={calculatePlaygroundRating(playground)} />
            </InfoRow>

            <InfoRow label="Состояние">
                <ConditionBadge condition={playground.condition} />
            </InfoRow>

            <InfoRow label="Последняя проверка">
                <InspectionSummary playground={playground} />
            </InfoRow>

            <PlaygroundInspectionPrompt
                playground={playground}
                onEdit={onEdit}
            />

        </InfoSection>

    );

}