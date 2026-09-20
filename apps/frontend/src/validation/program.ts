import type { NewProgram } from "../types/newProgram";

import type { ValidationResult } from "./index";

export function validateProgram(program: NewProgram): ValidationResult {
    const errors: ValidationResult["errors"] = [];

    if (program.title.trim().length === 0) {
        errors.push({ field: "title", message: "Введите название программы." });
    }

    return { valid: errors.length === 0, errors };
}
