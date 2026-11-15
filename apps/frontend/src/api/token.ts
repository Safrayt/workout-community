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

const TOKEN_ISSUED_AT_STORAGE_KEY = "workout-community:token-issued-at";

/** Как часто, пока человек пользуется сайтом, меняем токен на новый
 *  (POST /auth/refresh) — так сессия «скользящая» и не обрывается,
 *  пока сайтом пользуются. */
const TOKEN_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_ISSUED_AT_STORAGE_KEY, String(Date.now()));
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_ISSUED_AT_STORAGE_KEY);
}

/**
 * Пора ли обновить токен: он получен давно или неизвестно когда
 * (токены, сохранённые до появления продления, отметки не имеют — их
 * продлеваем при первой же возможности).
 */
export function isTokenRefreshDue(): boolean {
    const raw = localStorage.getItem(TOKEN_ISSUED_AT_STORAGE_KEY);
    const issuedAt = Number(raw);

    return (
        !raw ||
        Number.isNaN(issuedAt) ||
        Date.now() - issuedAt >= TOKEN_REFRESH_INTERVAL_MS
    );
}

/**
 * Событие окна: сервер ответил 401 на запрос с токеном (токен истёк
 * или отозван). detail.token — токен, с которым был отправлен запрос:
 * выходить нужно, только если он всё ещё текущий, иначе запоздавший
 * ответ на старый запрос выбросил бы только что вошедшего человека.
 */
export const AUTH_EXPIRED_EVENT = "workout-community:auth-expired";

export type AuthExpiredDetail = { token: string };

const SESSION_EXPIRED_STORAGE_KEY = "workout-community:session-expired";

/**
 * Одноразовая отметка «сессия закончилась» для страницы входа (как и
 * отметка об удалении аккаунта ниже): человека разлогинило не по его
 * воле, и форма входа объясняет почему.
 */
export function markSessionExpired(): void {
    sessionStorage.setItem(SESSION_EXPIRED_STORAGE_KEY, "1");
}

export function wasSessionExpired(): boolean {
    return sessionStorage.getItem(SESSION_EXPIRED_STORAGE_KEY) === "1";
}

export function clearSessionExpiredMark(): void {
    sessionStorage.removeItem(SESSION_EXPIRED_STORAGE_KEY);
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
