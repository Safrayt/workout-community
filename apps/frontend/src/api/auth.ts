import { apiFetch } from "./client";
import { API_BASE_URL } from "./config";
import { ApiError } from "./errors";
import { mapApiUserToUser, mapUserPatchToApi } from "./mappers/user";
import type { ApiUser } from "./mappers/user";
import { clearToken, setToken } from "./token";
import type { User } from "../types/user";

type TokenResponse = {
    access_token: string;
    token_type: string;
};

export type RegisterData = {
    name: string;
    nickname: string;
    locality: string;
    password: string;
    bio?: string;
};

/**
 * Регистрация. Бэкенд (/auth/register) сразу выдаёт токен, но не сам
 * объект пользователя — поэтому вторым шагом идёт GET /users/me.
 * Токен сохраняется в localStorage сразу после первого запроса, ещё
 * до второго — иначе он уйдёт без заголовка Authorization.
 */
export async function register(data: RegisterData): Promise<User> {
    const response = await apiFetch<TokenResponse>("/auth/register", {
        method: "POST",
        body: data,
        skipAuth: true,
    });

    setToken(response.access_token);

    return fetchCurrentUser();
}

/**
 * Вход. /auth/login на бэкенде — это OAuth2PasswordRequestForm,
 * он ждёт не JSON, а обычную HTML-форму
 * (application/x-www-form-urlencoded) с полями username/password,
 * поэтому здесь используется URLSearchParams как тело, а не apiFetch
 * с обычным объектом.
 */
export async function login(
    nickname: string,
    password: string
): Promise<User> {
    const formBody = new URLSearchParams({
        username: nickname,
        password,
    });

    const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formBody,
        }
    );

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
            typeof data?.detail === "string"
                ? data.detail
                : "Неверный логин или пароль";

        throw new ApiError(response.status, message);
    }

    const tokenData: TokenResponse = await response.json();

    setToken(tokenData.access_token);

    return fetchCurrentUser();
}

export function logout(): void {
    clearToken();
}

export async function fetchCurrentUser(): Promise<User> {
    const apiUser = await apiFetch<ApiUser>("/users/me");

    return mapApiUserToUser(apiUser);
}

/**
 * Частичное обновление профиля (имя, био, аватар, соцсети,
 * приватность) — используется в EditProfile и AccountSettings.
 * patch — это кусочек User "как на фронтенде", маппер сам разворачивает
 * его в плоские поля бэкенда.
 */
export async function updateCurrentUser(
    patch: Partial<User>
): Promise<User> {
    const apiUser = await apiFetch<ApiUser>("/users/me", {
        method: "PUT",
        body: mapUserPatchToApi(patch),
    });

    return mapApiUserToUser(apiUser);
}
