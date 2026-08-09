import "../../styles/components/playground-quick-facts.css";

import type { Playground } from "../../types/playground";

import {
    playgroundAccessLabels,
    playgroundConditionColors,
    playgroundConditionLabels,
    playgroundSizes,
    playgroundSurfaces,
} from "../../constants/playgroundProperties";

import { calculatePlaygroundRating } from "../../utils/playgroundRating";
import { getRatingTier } from "../../constants/playgroundRating";
import { pluralizeRu } from "../../utils/pluralize";

type Props = {
    playground: Playground;
};

/**
 * Строка "на первый взгляд" сразу под заголовком.
 * Отвечает на вопросы пользователя за секунды, без скролла:
 * стоит ли ехать, что тут есть, тренируются ли тут люди.
 */
export default function PlaygroundQuickFacts({
    playground,
}: Props) {
    const rating = calculatePlaygroundRating(playground);
    const ratingTier = getRatingTier(rating);

    return (
        <ul className="playground-quick-facts">
            <li className="playground-quick-facts__item">
                <span className="playground-quick-facts__label">
                    Рейтинг
                </span>

                <span
                    className="playground-quick-facts__value playground-quick-facts__value--rating"
                    style={{ color: ratingTier.color }}
                    title={ratingTier.label}
                >
                    {rating}
                    {" "}
                    / 100
                </span>
            </li>

            <li className="playground-quick-facts__item">
                <span className="playground-quick-facts__label">
                    Оборудование
                </span>

                <span className="playground-quick-facts__value">
                    {
                        `${playground.equipment.length} ${
                            pluralizeRu(
                                playground.equipment.length,
                                ["элемент", "элемента", "элементов"]
                            )
                        }`
                    }
                </span>
            </li>

            <li className="playground-quick-facts__item">
                <span className="playground-quick-facts__label">
                    Размер
                </span>

                <span className="playground-quick-facts__value">
                    {playgroundSizes[playground.size]}
                </span>
            </li>

            <li className="playground-quick-facts__item">
                <span className="playground-quick-facts__label">
                    Покрытие
                </span>

                <span className="playground-quick-facts__value">
                    {playgroundSurfaces[playground.surface]}
                </span>
            </li>

            <li className="playground-quick-facts__item">
                <span className="playground-quick-facts__label">
                    Состояние
                </span>

                <span
                    className="playground-quick-facts__value"
                    style={{
                        color: playgroundConditionColors[playground.condition],
                    }}
                >
                    {playgroundConditionLabels[playground.condition]}
                </span>
            </li>

            <li className="playground-quick-facts__item">
                <span className="playground-quick-facts__label">
                    Доступ
                </span>

                <span className="playground-quick-facts__value">
                    {playgroundAccessLabels[playground.access]}
                </span>
            </li>
        </ul>
    );
}
