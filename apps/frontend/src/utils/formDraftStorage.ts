/**
 * Общее хранилище черновиков форм (запись дневника — тренировка и
 * заметка).
 *
 * Хранится локально в браузере, в IndexedDB — в том же хранилище
 * "drafts", что и черновики площадок (utils/playgroundDraft.ts), по
 * тем же причинам: фото в формах живут как data-URL, и квота
 * localStorage (~5 МБ на весь сайт) на них быстро кончилась бы — а
 * вместе с ней перестал бы сохраняться и токен входа.
 *
 * Ключ включает вид формы и id пользователя, поэтому на общем
 * компьютере чужой черновик не подставится. Все функции намеренно
 * никогда не бросают исключений: если IndexedDB недоступен (приватный
 * режим, запрет в настройках), форма просто работает без черновиков.
 */

// Те же имя базы, версия и хранилище, что у черновиков площадок: у
// одной базы не может быть двух схем, поэтому значения должны совпадать.
const DB_NAME = "workout-community";
const DB_VERSION = 1;
const STORE_NAME = "drafts";

/** Черновик старше этого срока считается забытым и не подставляется. */
export const FORM_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type StoredFormDraft<T> = {
    savedAt: number;
    value: T;
};

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
            reject(new Error("IndexedDB недоступен."));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function runRequest<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
    const database = await openDatabase();

    return new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const request = action(transaction.objectStore(STORE_NAME));

        transaction.oncomplete = () => {
            database.close();
            resolve(request.result);
        };

        transaction.onerror = () => {
            database.close();
            reject(transaction.error);
        };

        transaction.onabort = () => {
            database.close();
            reject(transaction.error);
        };
    });
}

/**
 * Черновик формы, сохранённый ранее; null — его нет, он устарел или
 * хранилище недоступно. Что считать пустым черновиком и как привести
 * старый черновик к актуальной форме — решает вызывающий (normalize,
 * isEmpty): они зависят от полей конкретной формы.
 */
export async function loadFormDraft<T>(
    key: string,
    normalize: (raw: Partial<T>) => T,
    isEmpty: (value: T) => boolean
): Promise<T | null> {
    try {
        const stored = await runRequest<StoredFormDraft<Partial<T>> | undefined>(
            "readonly",
            (store) => store.get(key)
        );

        if (!stored?.value) {
            return null;
        }

        if (Date.now() - stored.savedAt > FORM_DRAFT_MAX_AGE_MS) {
            await clearFormDraft(key);
            return null;
        }

        const draft = normalize(stored.value);

        return isEmpty(draft) ? null : draft;
    } catch (error) {
        console.error("Не удалось загрузить черновик:", error);
        return null;
    }
}

export async function saveFormDraft<T>(key: string, value: T): Promise<void> {
    try {
        const draft: StoredFormDraft<T> = { savedAt: Date.now(), value };

        await runRequest("readwrite", (store) => store.put(draft, key));
    } catch (error) {
        console.error("Не удалось сохранить черновик:", error);
    }
}

export async function clearFormDraft(key: string): Promise<void> {
    try {
        await runRequest("readwrite", (store) => store.delete(key));
    } catch (error) {
        console.error("Не удалось удалить черновик:", error);
    }
}
