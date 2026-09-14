/**
 * Обрезает текст до maxLength символов, добавляя "…" при обрезке.
 * Пробелы по краям убираются до проверки длины — иначе строка ровно
 * на границе могла бы обрезаться посреди случайного пробела.
 */
export function truncateText(text: string, maxLength: number): string {
    const trimmed = text.trim();

    if (trimmed.length <= maxLength) {
        return trimmed;
    }

    return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}
