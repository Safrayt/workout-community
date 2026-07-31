import type {
    NewEvent,
} from "../types/newEvent";

import type {
    ValidationResult,
    ValidationError,
} from "./index";

export function validateEvent(
    event: NewEvent
): ValidationResult {

    const errors: ValidationError[] = [];
    const date = new Date(event.startDate);
        if (Number.isNaN(date.getTime())) {
        errors.push({
            field: "startDate",
            message: "Некорректная дата.",
        });
    }

        if (
        event.title.trim().length === 0
    ) {
        errors.push({
            field: "title",
            message: "Введите название мероприятия.",
        });
    }

        if (
        event.description.trim().length === 0
    ) {
        errors.push({
            field: "description",
            message: "Добавьте описание мероприятия.",
        });
    }
        if (
        event.playgroundId.trim().length === 0
    ) {
        errors.push({
            field: "playgroundId",
            message: "Выберите площадку.",
        });
    }
        if (
        event.startDate.trim().length === 0
    ) {
        errors.push({
            field: "startDate",
            message: "Укажите дату мероприятия.",
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

