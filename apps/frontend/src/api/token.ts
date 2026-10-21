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

const ACCOUNT_DELETED_STORAGE_KEY = "workout-community:account-deleted";

/**
 * Одноразовая отметка "только что удалили аккаунт" для страницы
 * входа. Через state роутера это не передать: после выхода
 * ProtectedLayout сам перенаправляет на /login со своим state и
 * затирает чужой. sessionStorage живёт до закрытия вкладки, а Login
 * стирает отметку сразу после показа сообщения.
 */
export function markAccountDeleted(): void {
    sessionStorage.setItem(ACCOUNT_DELETED_STORAGE_KEY, "1");
}

export function wasAccountDeleted(): boolean {
    return sessionStorage.getItem(ACCOUNT_DELETED_STORAGE_KEY) === "1";
}

export function clearAccountDeletedMark(): void {
    sessionStorage.removeItem(ACCOUNT_DELETED_STORAGE_KEY);
}
