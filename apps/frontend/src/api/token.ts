const TOKEN_STORAGE_KEY = "workout-community:token";

/**
 * Токен хранится в localStorage — это отдельное реальное
 * SPA-приложение (Vite), а не встроенный артефакт внутри чата,
 * так что ограничение на браузерное хранилище сюда не относится.
 * Токен переживает перезагрузку страницы и закрытие вкладки, пока
 * пользователь явно не выйдет (logout) или токен не протухнет.
 */
export function getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
}
