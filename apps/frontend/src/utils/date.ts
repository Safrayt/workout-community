const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * true, если dateString попадает в промежуток
 * [сейчас - days суток; сейчас]. Даты в будущем (например,
 * ещё не начавшееся мероприятие) не считаются "недавними".
 */
export function isWithinLastDays(
    dateString: string,
    days: number
) {
    const date = new Date(dateString).getTime();
    const now = Date.now();

    if (Number.isNaN(date)) {
        return false;
    }

    const daysAgo = now - days * MS_PER_DAY;

    return date >= daysAgo && date <= now;
}

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Скользящее окно в часах (UX-HOME §5): createdAt >= now - hours, а
 * не календарный день. Используется картой "Активность на площадках".
 */
export function isWithinLastHours(
    dateString: string,
    hours: number
) {
    const date = new Date(dateString).getTime();
    const now = Date.now();

    if (Number.isNaN(date)) {
        return false;
    }

    const hoursAgo = now - hours * MS_PER_HOUR;

    return date >= hoursAgo && date <= now;
}
