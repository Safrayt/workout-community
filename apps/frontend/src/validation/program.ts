import type { NewProgram } from "../types/newProgram";

import type { ValidationResult } from "./index";

/** Предел длины описания программы (как на сервере, MAX_DESCRIPTION_LENGTH). */
export const MAX_PROGRAM_DESCRIPTION_LENGTH = 30_000;

export function validateProgram(program: NewProgram): ValidationResult {
    const errors: ValidationResult["errors"] = [];

    if (program.title.trim().length === 0) {
        errors.push({ field: "title", message: "Введите название программы." });
    }

    if (program.description.length > MAX_PROGRAM_DESCRIPTION_LENGTH) {
        errors.push({
            field: "description",
            message: `Описание не длиннее ${MAX_PROGRAM_DESCRIPTION_LENGTH.toLocaleString("ru-RU")} символов.`,
        });
    }

    return { valid: errors.length === 0, errors };
}
