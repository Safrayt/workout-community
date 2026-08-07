import "../../../styles/components/soon-badge.css";

type SoonBadgeProps = {
    label?: string;
};

/**
 * Метка для полей и блоков, которые есть в дизайне площадки,
 * но пока не подкреплены данными на бэкенде (рейтинг, отзывы,
 * статистика посещений и т.д.). Показывает честное "Скоро"
 * вместо того, чтобы либо скрывать блок целиком, либо
 * подставлять выдуманные значения.
 */
export default function SoonBadge({
    label = "Скоро",
}: SoonBadgeProps) {
    return (
        <span className="soon-badge">
            {label}
        </span>
    );
}
