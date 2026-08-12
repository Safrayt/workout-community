export function formatWorkoutEntryDate(
    date: string
) {
    const parsedDate = new Date(date);

    const weekday = parsedDate.toLocaleDateString(
        "ru-RU",
        {
            weekday: "long",
        }
    );

    const formattedDate = parsedDate.toLocaleDateString(
        "ru-RU",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }
    );

    return `${capitalize(weekday)} • ${formattedDate}`;
}

function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Полная дата без дня недели, для Hero и Quick Facts страницы
 * записи дневника: "20 июля 2026" (UX-DIARY-ENTRY §9, §10).
 * В отличие от formatWorkoutEntryDate (используется в карточке
 * списка) здесь не нужен день недели — только узнаваемая дата.
 */
export function formatWorkoutEntryDateLong(
    date: string
) {
    const parsedDate = new Date(date);

    return parsedDate.toLocaleDateString(
        "ru-RU",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
        }
    );
}