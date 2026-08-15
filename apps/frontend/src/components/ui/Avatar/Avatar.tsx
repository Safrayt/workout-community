import "../../../styles/components/avatar.css";

type Props = {

    name: string;

    avatarUrl?: string;

    size?: "sm" | "md" | "lg";

};

const BACKGROUND_COLORS = [
    "#2f855a",
    "#3182ce",
    "#dd6b20",
    "#805ad5",
    "#d53f8c",
    "#2c7a7b",
];

function getInitials(name: string) {
    const parts =
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (parts.length === 0) {
        return "?";
    }

    const first = parts[0][0];
    const second = parts.length > 1 ? parts[1][0] : "";

    return (first + second).toUpperCase();
}

function getBackgroundColor(name: string) {
    const hash =
        name
            .split("")
            .reduce(
                (sum, char) => sum + char.charCodeAt(0),
                0
            );

    return BACKGROUND_COLORS[
        hash % BACKGROUND_COLORS.length
    ];
}

/**
 * Универсальный аватар пользователя. В моковых данных у всех
 * пользователей `avatarUrl: ""`, поэтому основной сценарий —
 * инициалы на цветном фоне; фото используется, как только
 * оно появится (в профиле или после интеграции с бэкендом).
 */
export default function Avatar({
    name,
    avatarUrl,
    size = "md",
}: Props) {

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={name}
                className={`avatar avatar--${size}`}
            />
        );
    }

    return (
        <span
            className={`avatar avatar--${size} avatar--initials`}
            style={{
                background: getBackgroundColor(name),
            }}
            aria-hidden="true"
        >
            {getInitials(name)}
        </span>
    );
}
