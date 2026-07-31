import type {
    ValidationError,
} from "../validation";

export function getFieldError(
    errors: ValidationError[],
    field: string
): string | undefined {

    return errors.find(
        (error) =>
            error.field === field
    )?.message;

}