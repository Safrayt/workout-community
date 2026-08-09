/**
 * Возвращает нужную форму русского слова по числу:
 * pluralizeRu(1, ["тренировка", "тренировки", "тренировок"]) -> "тренировка"
 * pluralizeRu(3, ["тренировка", "тренировки", "тренировок"]) -> "тренировки"
 * pluralizeRu(11, ["тренировка", "тренировки", "тренировок"]) -> "тренировок"
 */
export function pluralizeRu(
    count: number,
    forms: [one: string, few: string, many: string]
) {
    const absCount = Math.abs(count);

    const lastTwoDigits = absCount % 100;
    const lastDigit = absCount % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return forms[2];
    }

    if (lastDigit === 1) {
        return forms[0];
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return forms[1];
    }

    return forms[2];
}
