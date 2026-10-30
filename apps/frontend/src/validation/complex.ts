import type { NewComplex } from "../types/newComplex";
import type { SchemeBlock } from "../types/complexScheme";

import type { ValidationError, ValidationResult } from "./index";

// Человекочитаемый id-слаг для URL (например, "hannibal-scheme-steel") —
// только строчные латинские буквы, цифры и дефисы, без дефиса в начале/
// конце и без двойных дефисов подряд.
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Проверка схемы: возвращает список понятных сообщений (пустой — всё в
 * порядке). Зеркало серверной validate_scheme (app/models_complex.py):
 * здесь — чтобы подсказать сразу, там — как последняя защита.
 */
export function validateScheme(scheme: SchemeBlock[]): string[] {
    const messages: string[] = [];

    if (scheme.length === 0 || scheme.every((block) => block.items.length === 0)) {
        return ["Добавьте в схему хотя бы одно упражнение из базы упражнений."];
    }

    scheme.forEach((block, blockIndex) => {
        const where = `Блок ${blockIndex + 1}`;

        if (block.items.length === 0) {
            messages.push(`${where}: добавьте хотя бы одно упражнение или удалите блок.`);
        }

        if (block.rounds === null) {
            if (block.timeLimitSeconds === null || block.timeLimitSeconds < 1) {
                messages.push(`${where}: для «максимум за время» укажите лимит времени.`);
            }
        } else if (!Number.isInteger(block.rounds) || block.rounds < 1 || block.rounds > 100) {
            messages.push(`${where}: число кругов или подходов — от 1 до 100.`);
        }

        block.items.forEach((item, itemIndex) => {
            const row = `${where}, упражнение ${itemIndex + 1}`;

            const hasWorkload =
                item.reps !== null || item.maxEffort || item.durationSeconds !== null;

            if (!hasWorkload) {
                messages.push(`${row}: укажите нагрузку — повторения, время или максимум.`);
            }

            if (item.reps !== null && (item.reps < 1 || item.reps > 1000)) {
                messages.push(`${row}: повторений — от 1 до 1000.`);
            }

            if (item.durationSeconds !== null && item.durationSeconds < 1) {
                messages.push(`${row}: время — не меньше 1 секунды.`);
            }

            if (item.repsStep !== 0 && item.repsLimit !== null && item.repsLimit < 1) {
                messages.push(`${row}: граница прогрессии — не меньше 1.`);
            }

            // Убывающая прогрессия не должна уходить в ноль и ниже.
            if (item.reps !== null && item.repsStep < 0 && block.rounds !== null) {
                let last = item.reps + item.repsStep * (block.rounds - 1);

                if (item.repsLimit !== null) {
                    last = Math.max(last, item.repsLimit);
                }

                if (last < 1) {
                    messages.push(
                        `${row}: повторения опускаются ниже 1 — укажите границу («не ниже …») или уменьшите шаг.`
                    );
                }
            }
        });
    });

    return messages;
}

export function validateComplex(
    complex: NewComplex,
    options: { isEditing?: boolean } = {}
): ValidationResult {
    const errors: ValidationError[] = [];

    if (!options.isEditing) {
        const trimmedId = complex.id.trim();

        if (trimmedId.length === 0) {
            errors.push({ field: "id", message: "Укажите id комплекса." });
        } else if (!ID_PATTERN.test(trimmedId)) {
            errors.push({
                field: "id",
                message:
                    "id может содержать только строчные латинские буквы, " +
                    "цифры и дефисы (например, hannibal-scheme-steel).",
            });
        }
    }

    if (complex.name.trim().length === 0) {
        errors.push({ field: "name", message: "Введите название комплекса." });
    }

    if (complex.types.length === 0) {
        errors.push({
            field: "types",
            message: "Выберите хотя бы один тип тренировки.",
        });
    }

    for (const message of validateScheme(complex.scheme)) {
        errors.push({ field: "scheme", message });
    }

    if (complex.resultMetrics.length === 0) {
        errors.push({
            field: "resultMetrics",
            message: "Выберите хотя бы один показатель результата.",
        });
    }

    return { valid: errors.length === 0, errors };
}
