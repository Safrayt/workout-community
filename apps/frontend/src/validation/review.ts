import type {
    NewReview,
} from "../types/newReview";

import type {
    ValidationResult,
    ValidationError,
} from "./index";

export const REVIEW_TEXT_MIN_LENGTH = 10;

export function validateReview(
    review: NewReview
): ValidationResult {

    const errors: ValidationError[] = [];

    const trimmedText = review.text.trim();

    if (trimmedText.length === 0) {
        errors.push({
            field: "text",
            message: "Напишите текст отзыва.",
        });
    } else if (trimmedText.length < REVIEW_TEXT_MIN_LENGTH) {
        errors.push({
            field: "text",
            message:
                `Отзыв должен содержать не менее ${REVIEW_TEXT_MIN_LENGTH} символов.`,
        });
    }

    if (review.playgroundId.trim().length === 0) {
        errors.push({
            field: "playgroundId",
            message: "Не выбрана площадка.",
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
