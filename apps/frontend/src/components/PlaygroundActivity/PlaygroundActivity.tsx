import "../../styles/components/playground-activity.css";

import type { Event } from "../../types/event";

import { isUpcomingEvent, isCompletedEvent } from "../../utils/eventStatus";

import InfoSection from "../ui/InfoSection/InfoSection";
import SoonBadge from "../ui/SoonBadge/SoonBadge";

type Props = {
    events: Event[];
};

/**
 * "Community History" из документа: показывает, что площадка живая.
 * Всё, что реально можно посчитать по данным о мероприятиях, — считаем.
 * Посетителей и подписчиков честно помечаем как "Скоро" —
 * этих данных в системе пока нет. Раскладка — обычная CSS-сетка
 * без горизонтальной прокрутки: на мобильных вложенный
 * overflow-x:auto ведёт себя ненадёжно и на части устройств
 * просто обрезает контент.
 */
export default function PlaygroundActivity({
    events,
}: Props) {
    const totalEvents = events.length;
    const upcomingEvents = events.filter(isUpcomingEvent).length;
    const completedEvents = events.filter(isCompletedEvent).length;

    return (
        <InfoSection title="Активность">
            <div className="playground-activity">
                <div className="playground-activity__row">
                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            {totalEvents}
                        </span>

                        <span className="playground-activity__label">
                            Всего мероприятий
                        </span>
                    </div>

                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            {upcomingEvents}
                        </span>

                        <span className="playground-activity__label">
                            Предстоящих
                        </span>
                    </div>

                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            {completedEvents}
                        </span>

                        <span className="playground-activity__label">
                            Проведённых
                        </span>
                    </div>

                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            <SoonBadge />
                        </span>

                        <span className="playground-activity__label">
                            Посетителей
                        </span>
                    </div>

                    <div className="playground-activity__stat">
                        <span className="playground-activity__value">
                            <SoonBadge />
                        </span>

                        <span className="playground-activity__label">
                            Подписчиков
                        </span>
                    </div>
                </div>
            </div>
        </InfoSection>
    );
}
