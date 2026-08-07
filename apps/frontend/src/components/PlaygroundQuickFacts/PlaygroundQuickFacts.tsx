import "../../styles/components/playground-quick-facts.css";

import type { Playground } from "../../types/playground";
import type { Event } from "../../types/event";

import { isUpcomingEvent } from "../../utils/eventStatus";
import {
    playgroundAccessLabels,
    playgroundSizes,
} from "../../constants/playgroundProperties";

import { calculatePlaygroundRating } from "../../utils/playgroundRating";
import { getRatingTier } from "../../constants/playgroundRating";

type Props = {
    playground: Playground;

    playgroundEvents: Event[];
};

/**
 * Строка "на первый взгляд" сразу под заголовком.
 * Отвечает на вопросы пользователя за секунды, без скролла:
 * стоит ли ехать, что тут есть, тренируются ли тут люди.
 */
export default function PlaygroundQuickFacts({
    playground,
    playgroundEvents,
}: Props) {
    const upcomingCount = playgroundEvents.filter(
        isUpcomingEvent
    ).length;

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
                    Размер
                </span>

                <span className="playground-quick-facts__value">
                    {playgroundSizes[playground.size]}
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

            <li className="playground-quick-facts__item">
                <span className="playground-quick-facts__label">
                    Мероприятия
                </span>

                <span className="playground-quick-facts__value">
                    {
                        upcomingCount > 0
                            ? `${upcomingCount} ${pluralizeEvents(upcomingCount)}`
                            : "Нет ближайших"
                    }
                </span>
            </li>
        </ul>
    );
}

function pluralizeEvents(count: number) {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return "предстоящих";
    }

    if (lastDigit === 1) {
        return "предстоящее";
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return "предстоящих";
    }

    return "предстоящих";
}
