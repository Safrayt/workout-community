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

/**
 * Короткая дата без дня недели: "27.09.2026" — для компактных
 * карточек (например, в ленте на Главной). Дата записи хранится как
 * "YYYY-MM-DD", поэтому день/месяц/год берём прямо из строки, а не
 * через new Date(): так календарный день не может "уехать" из-за
 * часового пояса пользователя.
 */
export function formatWorkoutEntryDateShort(
    date: string
) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);

    if (match) {
        const [, year, month, day] = match;

        return `${day}.${month}.${year}`;
    }

    return new Date(date).toLocaleDateString(
        "ru-RU",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }
    );
}
