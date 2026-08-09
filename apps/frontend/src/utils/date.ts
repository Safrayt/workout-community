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
