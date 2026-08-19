import { formatDate } from "./formatDate";
import { pluralizeRu } from "./pluralize";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Короткое относительное время публикации: "18 минут назад",
 * "2 часа назад", "вчера", иначе — дата (UX-HOME §21: "Для обычной
 * свежей записи достаточно: 🟢 Тренировка · 18 минут назад").
 */
export function formatTimeAgo(dateString: string) {
    const date = new Date(dateString).getTime();

    if (Number.isNaN(date)) {
        return "";
    }

    const diff = Date.now() - date;

    if (diff < MINUTE) {
        return "только что";
    }

    if (diff < HOUR) {
        const minutes = Math.floor(diff / MINUTE);

        return `${minutes} ${pluralizeRu(minutes, ["минуту", "минуты", "минут"])} назад`;
    }

    if (diff < DAY) {
        const hours = Math.floor(diff / HOUR);

        return `${hours} ${pluralizeRu(hours, ["час", "часа", "часов"])} назад`;
    }

    if (diff < 2 * DAY && isYesterday(date)) {
        return "вчера";
    }

    return formatDate(dateString);
}

function isYesterday(timestamp: number) {
    const date = new Date(timestamp);
    const yesterday = new Date();

    yesterday.setDate(yesterday.getDate() - 1);

    return (
        date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate()
    );
}

/** "добавлено сегодня" / "добавлено вчера" / "добавлено 12.08.2026". */
export function formatAddedLabel(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();

    if (isSameCalendarDay(date, now)) {
        return "добавлено сегодня";
    }

    if (isYesterday(date.getTime())) {
        return "добавлено вчера";
    }

    return `добавлено ${formatDate(dateString)}`;
}

function isSameCalendarDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/**
 * true, если дата события (activityDate) существенно отличается от
 * даты публикации (createdAt) — тогда карточка должна явно показать
 * обе даты, а не создавать впечатление, что событие произошло
 * сегодня (UX-HOME §21).
 */
export function isActivityDateDivergent(
    activityDate: string,
    createdAt: string
) {
    // date хранится как "YYYY-MM-DD", createdAt — ISO-строка;
    // сравниваем именно календарные даты, а не время.
    return activityDate !== createdAt.slice(0, 10);
}
