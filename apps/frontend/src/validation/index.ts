export type ValidationError = {
    field: string;
    message: string;
};

export type ValidationResult = {
    valid: boolean;
    errors: ValidationError[];
};