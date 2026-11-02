import { MAX_MANUFACTURER_URL_LENGTH } from "../constants/playgroundManufacturer";

/**
 * Приводит введённую ссылку на сайт к виду «https://…».
 * - пустая строка → "" (ссылки нет);
 * - адрес без схемы («example.com») считается https;
 * - не http/https, адрес с логином/паролем, хост без точки, пробелы,
 *   слишком длинная ссылка → null (некорректная).
 *
 * Правила те же, что у normalize_manufacturer_url на бэкенде
 * (app/models_playground.py) — там они главные: ссылки показываются
 * всем как кликабельные, и «javascript:…» пропускать нельзя. Здесь
 * проверяем, чтобы ошибку увидели в форме, а не после отправки; и
 * ещё раз перед выводом ссылки на странице.
 */
export function normalizeWebsiteUrl(value: string): string | null {
    const trimmed = value.trim();

    if (trimmed === "") {
        return "";
    }

    if (trimmed.length > MAX_MANUFACTURER_URL_LENGTH || /\s/.test(trimmed)) {
        return null;
    }

    const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;

    let url: URL;

    try {
        url = new URL(withScheme);
    } catch {
        return null;
    }

    if (
        (url.protocol !== "http:" && url.protocol !== "https:") ||
        !url.hostname.includes(".") ||
        url.username !== "" ||
        url.password !== ""
    ) {
        return null;
    }

    return withScheme;
}
