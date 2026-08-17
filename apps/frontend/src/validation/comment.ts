import type {
    ValidationResult,
    ValidationError,
} from "./index";

export const COMMENT_MAX_LENGTH = 500;

export function validateComment(
    text: string
): ValidationResult {
    const errors: ValidationError[] = [];

    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
        errors.push({
            field: "text",
            message: "Напишите текст комментария.",
        });
    } else if (trimmedText.length > COMMENT_MAX_LENGTH) {
        errors.push({
            field: "text",
            message:
                `Комментарий не должен превышать ${COMMENT_MAX_LENGTH} символов.`,
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
