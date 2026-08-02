import "../../../styles/components/tag-badge.css";

type TagBadgeProps = {
    label: string;

    active?: boolean;

    onClick?: () => void;

    onRemove?: () => void;
};

export default function TagBadge({
    label,
    active = false,
    onClick,
    onRemove,
}: TagBadgeProps) {
    return (
        <span
            className={[
                "tag-badge",
                active && "tag-badge--active",
            ]
                .filter(Boolean)
                .join(" ")}
        >

            {
                onClick ? (
                    <button
                        type="button"
                        className="tag-badge__label"
                        onClick={onClick}
                    >
                        {label}
                    </button>
                ) : (
                    <span className="tag-badge__label">
                        {label}
                    </span>
                )
            }

            {
                onRemove && (
                    <button
                        type="button"
                        className="tag-badge__remove"
                        onClick={onRemove}
                        aria-label={`Удалить тег ${label}`}
                    >
                        ×
                    </button>
                )
            }

        </span>
    );
}