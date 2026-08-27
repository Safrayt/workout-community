export const MAX_DESCRIPTION_PREVIEW_LINES = 5;

export function getDescriptionPreview(
    description: string,
    maxLines: number = MAX_DESCRIPTION_PREVIEW_LINES
) {
    const lines = description.split("\n");

    if (lines.length <= maxLines) {
        return description;
    }

    return [
        ...lines.slice(0, maxLines - 1),
        "...",
    ].join("\n");
}

const MAX_CARD_DESCRIPTION_LENGTH = 320;

/**
 * Короткий превью описания для компактной карточки списка дневника
 * (UX-DIARY §26: "не нужно показывать весь текст описания") — в
 * отличие от getDescriptionPreview (до 5 строк, для страницы
 * записи), здесь ограничение по символам, но переносы строк из
 * исходного текста сохраняются (карточка рендерит их через
 * white-space: pre-line в CSS) — только лишние пробелы/табы внутри
 * каждой строки схлопываются в один пробел.
 *
 * 320 символов — заведомо больше, чем помещается в 5 строк карточки
 * (workout-entry-card__description ограничена в CSS через
 * -webkit-line-clamp: 5). Так реальную визуальную обрезку делает
 * CSS по границе строки, а не эта функция по количеству символов —
 * иначе текст обрывался заметно раньше, чем позволяет место в
 * плашке, и часть плашки без картинки оставалась пустой.
 */
export function getCardDescriptionPreview(
    description: string,
    maxLength: number = MAX_CARD_DESCRIPTION_LENGTH
) {
    const withNormalizedLines = description
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .join("\n")
        .trim();

    if (withNormalizedLines.length <= maxLength) {
        return withNormalizedLines;
    }

    return `${withNormalizedLines.slice(0, maxLength).trimEnd()}...`;
}