import type { NewComplex } from "../types/newComplex";

import type { ValidationError, ValidationResult } from "./index";

// Человекочитаемый id-слаг для URL (например, "hannibal-scheme-steel") —
// только строчные латинские буквы, цифры и дефисы, без дефиса в начале/
// конце и без двойных дефисов подряд.
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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

    if (complex.schemeDisplay.trim().length === 0) {
        errors.push({
            field: "schemeDisplay",
            message: "Опишите схему выполнения.",
        });
    }

    if (complex.movements.length === 0) {
        errors.push({
            field: "movements",
            message: "Выберите хотя бы одно движение.",
        });
    }

    if (complex.exercise.trim().length === 0) {
        errors.push({
            field: "exercise",
            message: "Укажите упражнение(я), из которых состоит комплекс.",
        });
    }

    if (complex.resultMetrics.length === 0) {
        errors.push({
            field: "resultMetrics",
            message: "Выберите хотя бы один показатель результата.",
        });
    }

    for (const condition of complex.starConditions) {
        if (!complex.resultMetrics.includes(condition.metric)) {
            errors.push({
                field: "starConditions",
                message:
                    `Условие для ${condition.stars} звёзд использует ` +
                    "показатель, не выбранный в «Показатели результата» " +
                    "выше.",
            });
            break;
        }

        if (!Number.isFinite(condition.value)) {
            errors.push({
                field: "starConditions",
                message: "Заполните значение для всех условий звёзд.",
            });
            break;
        }
    }

    return { valid: errors.length === 0, errors };
}
