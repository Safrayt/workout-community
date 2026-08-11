export function formatEventDate(
    startDate: string
) {
    const date = new Date(startDate);

    const weekday = date.toLocaleDateString(
        "ru-RU",
        {
            weekday: "long",
        }
    );

    const formattedDate = date.toLocaleDateString(
        "ru-RU",
        {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        }
    );

    const time = date.toLocaleTimeString(
        "ru-RU",
        {
            hour: "2-digit",
            minute: "2-digit",
        }
    );

    return `${capitalize(weekday)} • ${formattedDate} • ${time}`;
}

function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Полная дата без времени, для Hero и Quick Facts:
 * "12 августа 2026". Время выводится отдельной строкой рядом,
 * поэтому здесь оно не нужно.
 */
export function formatEventDateLong(
    startDate: string
) {
    const date = new Date(startDate);

    return date.toLocaleDateString(
        "ru-RU",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
        }
    );
}

/**
 * Только время события: "18:30". Используется там, где дата
 * уже выведена отдельно (Hero, Quick Facts) и повторять её не нужно.
 */
export function formatEventTime(
    startDate: string
) {
    const date = new Date(startDate);

    return date.toLocaleTimeString(
        "ru-RU",
        {
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}

/**
 * Короткая форма даты события для тесных мест (карточка площадки,
 * попап карты): "Сб, 12.09 • 18:00" вместо полной строки с годом.
 */
export function formatEventDateShort(
    startDate: string
) {
    const date = new Date(startDate);

    const weekday = date.toLocaleDateString(
        "ru-RU",
        {
            weekday: "short",
        }
    );

    const formattedDate = date.toLocaleDateString(
        "ru-RU",
        {
            day: "2-digit",
            month: "2-digit",
        }
    );

    const time = date.toLocaleTimeString(
        "ru-RU",
        {
            hour: "2-digit",
            minute: "2-digit",
        }
    );

    return `${capitalize(weekday)}, ${formattedDate} • ${time}`;
}