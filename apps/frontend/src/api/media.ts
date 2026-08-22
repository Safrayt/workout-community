import { API_BASE_URL } from "./config";

/**
 * Бэкенд отдаёт ссылки на загруженные файлы относительными
 * (например "/uploads/playgrounds/xxx.jpg", см. app/files.py) — они
 * подразумевают адрес самого бэкенда, а не фронтенда, на котором
 * рендерится страница. Превращаем в абсолютный URL, иначе браузер
 * попытается запросить их с адреса Vite dev-сервера.
 */
export function resolveMediaUrl(
    url: string | null | undefined
): string | undefined {
    if (!url) {
        return undefined;
    }

    if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("data:")
    ) {
        return url;
    }

    return `${API_BASE_URL}${url}`;
}
