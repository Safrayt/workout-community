import "../../styles/components/activity-map-legend.css";

/**
 * Легенда цветов маркеров карты активности (UX-HOME §7). Цвет
 * маркера не связан с рейтингом площадки — это отдельная шкала, её
 * стоит явно расшифровать рядом с картой.
 */
export default function ActivityMapLegend() {
    return (
        <ul className="activity-map-legend">
            <li className="activity-map-legend__item">
                <span className="activity-map-legend__dot activity-map-legend__dot--workout" />
                Есть тренировка
            </li>

            <li className="activity-map-legend__item">
                <span className="activity-map-legend__dot activity-map-legend__dot--note" />
                Только заметки
            </li>
        </ul>
    );
}
