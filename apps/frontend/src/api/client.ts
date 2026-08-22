import { API_BASE_URL } from "./config";
import { ApiError } from "./errors";
import { getToken } from "./token";

type RequestOptions = {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    /** Обычный объект — уйдёт как JSON. FormData — уйдёт как есть
     * (для загрузки фото), Content-Type для неё браузер выставит
     * сам вместе с boundary, поэтому руками его не трогаем. */
    body?: unknown;
    /** Не добавлять заголовок Authorization, даже если токен есть —
     * нужно для /auth/login и /auth/register. */
    skipAuth?: boolean;
};

/**
 * Достаёт человекочитаемое сообщение из тела ответа FastAPI.
 * HTTPException кладёт detail строкой, а ошибки валидации pydantic
 * (422) — массивом объектов {msg, loc, ...}. Пробуем и то, и то,
 * а если не получилось — отдаём стандартный текст по коду статуса.
 */
async function extractErrorMessage(
    response: Response
): Promise<string> {
    try {
        const data = await response.json();

        if (typeof data.detail === "string") {
            return data.detail;
        }

        if (Array.isArray(data.detail)) {
            return data.detail
                .map((item: { msg?: string }) => item.msg)
                .filter(Boolean)
                .join(", ");
        }
    } catch {
        // Тело не JSON или пустое — используем сообщение по умолчанию.
    }

    return `Ошибка запроса (${response.status})`;
}

/**
 * Универсальный запрос к API. T — тип ожидаемого тела ответа.
 * Для ответов 204 No Content возвращает undefined as T — вызывающий
 * код в этом случае и не ждёт тело (см. DELETE-запросы во всех
 * api/*.ts).
 */
export async function apiFetch<T>(
    path: string,
    options: RequestOptions = {}
): Promise<T> {
    const { method = "GET", body, skipAuth = false } = options;

    const headers: Record<string, string> = {};
    const isFormData = body instanceof FormData;

    if (body !== undefined && !isFormData) {
        headers["Content-Type"] = "application/json";
    }

    if (!skipAuth) {
        const token = getToken();

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body:
            body === undefined
                ? undefined
                : isFormData
                    ? (body as FormData)
                    : JSON.stringify(body),
    });

    if (!response.ok) {
        throw new ApiError(
            response.status,
            await extractErrorMessage(response)
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

/**
 * Собирает query-строку из объекта, пропуская undefined/null —
 * чтобы не писать вручную склейку "?a=1&b=2" в каждом api/*.ts.
 */
export function buildQuery(
    params: Record<string, string | number | boolean | undefined | null>
): string {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            search.set(key, String(value));
        }
    }

    const query = search.toString();

    return query ? `?${query}` : "";
}
