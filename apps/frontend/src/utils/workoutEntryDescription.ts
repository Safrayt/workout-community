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

const MAX_CARD_DESCRIPTION_LENGTH = 100;

/**
 * Короткий превью описания для компактной карточки списка дневника
 * (UX-DIARY §26: "не нужно показывать весь текст описания") — в
 * отличие от getDescriptionPreview (до 5 строк, для страницы
 * записи), здесь ограничение по символам и без переносов строк.
 */
export function getCardDescriptionPreview(
    description: string,
    maxLength: number = MAX_CARD_DESCRIPTION_LENGTH
) {
    const singleLine = description
        .replace(/\s+/g, " ")
        .trim();

    if (singleLine.length <= maxLength) {
        return singleLine;
    }

    return `${singleLine.slice(0, maxLength).trimEnd()}...`;
}