import type { NewArticle } from "../types/article";

/**
 * Копии статьи, которые редактор сам сохраняет в браузере по мере
 * набора текста (см. hooks/useArticleDraftAutosave.ts), чтобы текст не
 * терялся при закрытой вкладке, сбое сети или перезагрузке страницы.
 *
 * Это копия ТОЛЬКО в этом браузере: на сайте (и для читателей) статья
 * от неё не меняется, а на другом устройстве её не будет. Чтобы статья
 * сохранилась на сайте, нужна кнопка "Сохранить черновик" или
 * "Опубликовать".
 *
 * Хранилище браузера бывает недоступно (приватный режим, запрет в
 * настройках) или переполнено, поэтому каждое обращение к нему защищено:
 * ошибка превращается в "не получилось сохранить", а не в падение
 * страницы.
 */

const KEY_PREFIX = "workout-community:article-draft:";
const FORMAT_VERSION = 1;

/** Копии старше этого срока считаются забытыми и удаляются при чтении. */
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type StoredArticleDraft = {
    version: typeof FORMAT_VERSION;

    /** Когда копия сохранена (ISO). */
    savedAt: string;

    /**
     * updatedAt статьи на сайте в тот момент, когда началась правка (у
     * новой статьи — null). Если за время, пока копия лежала, статью
     * изменили, редактор предупредит: сохранение перезапишет эти правки.
     */
    baseUpdatedAt: string | null;

    value: NewArticle;
};

/**
 * Ключ копии: у новой статьи свой, у существующей — по её адресу.
 * Префикс "article:" нужен, чтобы статья со слагом "new" не
 * перепутала свою копию с копией новой статьи.
 */
function storageKey(articleId: string | null): string {
    return `${KEY_PREFIX}${articleId === null ? "new" : `article:${articleId}`}`;
}

function getStorage(): Storage | null {
    try {
        // Само обращение к window.localStorage может бросить
        // SecurityError, если браузер запретил хранилище.
        return window.localStorage;
    } catch {
        return null;
    }
}

function isStringArray(value: unknown): value is string[] {
    return (
        Array.isArray(value) && value.every((item) => typeof item === "string")
    );
}

/**
 * Проверяет прочитанное из хранилища: туда могла попасть копия другой
 * версии сайта или испорченная строка. Возвращает null, если форма не
 * та, — лучше потерять такую копию, чем показать в редакторе мусор.
 */
function parseStoredDraft(raw: string): StoredArticleDraft | null {
    let data: unknown;

    try {
        data = JSON.parse(raw);
    } catch {
        return null;
    }

    if (typeof data !== "object" || data === null) {
        return null;
    }

    const draft = data as Record<string, unknown>;
    const value = draft.value as Record<string, unknown> | null;

    if (
        draft.version !== FORMAT_VERSION ||
        typeof draft.savedAt !== "string" ||
        !Number.isFinite(Date.parse(draft.savedAt)) ||
        !(draft.baseUpdatedAt === null || typeof draft.baseUpdatedAt === "string") ||
        typeof value !== "object" ||
        value === null ||
        typeof value.title !== "string" ||
        typeof value.summary !== "string" ||
        typeof value.body !== "string" ||
        typeof value.category !== "string" ||
        !isStringArray(value.tags) ||
        !(value.coverUrl === null || typeof value.coverUrl === "string")
    ) {
        return null;
    }

    return {
        version: FORMAT_VERSION,
        savedAt: draft.savedAt,
        baseUpdatedAt: draft.baseUpdatedAt,
        value: {
            title: value.title,
            summary: value.summary,
            body: value.body,
            category: value.category as NewArticle["category"],
            tags: value.tags,
            coverUrl: value.coverUrl,
            // Опубликована статья или нет, решает кнопка сохранения, а
            // не копия: см. isSameArticleContent.
            isPublished: false,
        },
    };
}

/** Копия статьи или null: нет копии, она устарела, испорчена или хранилище недоступно. */
export function loadArticleDraft(
    articleId: string | null,
    now: number = Date.now()
): StoredArticleDraft | null {
    const storage = getStorage();

    if (!storage) {
        return null;
    }

    const key = storageKey(articleId);

    let raw: string | null;

    try {
        raw = storage.getItem(key);
    } catch {
        return null;
    }

    if (raw === null) {
        return null;
    }

    const draft = parseStoredDraft(raw);

    if (!draft || now - Date.parse(draft.savedAt) > DRAFT_MAX_AGE_MS) {
        clearArticleDraft(articleId);

        return null;
    }

    return draft;
}

/** false — сохранить не удалось (хранилище недоступно или переполнено). */
export function saveArticleDraft(
    articleId: string | null,
    value: NewArticle,
    baseUpdatedAt: string | null,
    now: Date = new Date()
): boolean {
    const storage = getStorage();

    if (!storage) {
        return false;
    }

    const draft: StoredArticleDraft = {
        version: FORMAT_VERSION,
        savedAt: now.toISOString(),
        baseUpdatedAt,
        value,
    };

    try {
        storage.setItem(storageKey(articleId), JSON.stringify(draft));

        return true;
    } catch {
        return false;
    }
}

export function clearArticleDraft(articleId: string | null): void {
    try {
        getStorage()?.removeItem(storageKey(articleId));
    } catch {
        // Нечего делать: удалять нечего или некуда.
    }
}
