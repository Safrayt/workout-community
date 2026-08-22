/**
 * Ошибка ответа API. message уже человекочитаемый — вытащен из
 * поля "detail", которое FastAPI кладёт в тело ответа при HTTPException
 * (см. detail=... во всех роутерах бэкенда).
 */
export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}
