import type { NewPlayground } from "../types/newPlayground";

import { playgroundEquipment } from "../constants/playgroundEquipment";
import { MAX_PLAYGROUND_PHOTOS } from "../constants/playgroundPhotos";

/**
 * Черновики добавления площадки.
 *
 * Хранятся локально в браузере пользователя, в IndexedDB, а не в
 * localStorage: фотографии в форме живут как data-URL (до 5 штук по
 * несколько сотен КБ), и квота localStorage (~5 МБ на весь сайт) на
 * них быстро кончилась бы — а вместе с ней перестал бы сохраняться и
 * токен входа, который лежит в том же localStorage.
 *
 * Черновик — один на пользователя (ключ включает id), поэтому на
 * общем компьютере чужой черновик не подставится. Все функции
 * намеренно никогда не бросают исключений: если IndexedDB недоступен
 * (приватный режим, запрет в настройках), форма просто работает без
 * черновиков, как раньше.
 */

const DB_NAME = "workout-community";
const DB_VERSION = 1;
const STORE_NAME = "drafts";

/** Черновик старше этого срока считается забытым и не подставляется. */
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type StoredDraft = {
    savedAt: number;
    playground: NewPlayground;
};

export function createEmptyPlayground(): NewPlayground {
    return {
        name: "",
        locality: "",
        address: "",
        coordinates: null,
        size: "",
        surface: "",
        access: "",
        accessRestrictions: "",
        condition: "",
        amenities: {
            lighting: false,
            covered: false,
            changingRoom: false,
            toilet: false,
            drinkingWater: false,
            shower: false,
            parking: false,
            bicycleParking: false,
            trashBins: false,
            shade: false,
        },
        equipment: [],
        photos: [],
        openingHours: "",
        description: "",
    };
}

function getDraftKey(userId: string) {
    return `playground:${userId}`;
}

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
 * Пустая форма — это и есть "нет черновика": ничего не введено и не
 * выбрано. Такое состояние не сохраняем, а уже сохранённый черновик
 * в этом случае удаляем (пользователь всё стёр вручную).
 */
export function isPlaygroundDraftEmpty(playground: NewPlayground) {
    return (
        playground.name.trim() === "" &&
        playground.description.trim() === "" &&
        playground.accessRestrictions.trim() === "" &&
        playground.openingHours.trim() === "" &&
        playground.coordinates === null &&
        playground.size === "" &&
        playground.surface === "" &&
        playground.access === "" &&
        playground.condition === "" &&
        playground.photos.length === 0 &&
        playground.equipment.length === 0 &&
        !Object.values(playground.amenities).some(Boolean)
    );
}

/**
 * Черновик мог быть сохранён более старой версией формы (например,
 * до появления нового удобства) — накладываем его на актуальную
 * пустую форму, чтобы не получить undefined в новых полях, и
 * отбрасываем оборудование, которого больше нет в справочнике.
 */
function normalizeDraft(raw: Partial<NewPlayground>): NewPlayground {
    const base = createEmptyPlayground();

    return {
        ...base,
        ...raw,
        amenities: {
            ...base.amenities,
            ...(raw.amenities ?? {}),
        },
        equipment: Array.isArray(raw.equipment)
            ? raw.equipment.filter((key) => key in playgroundEquipment)
            : [],
        photos: Array.isArray(raw.photos)
            ? raw.photos.slice(0, MAX_PLAYGROUND_PHOTOS)
            : [],
    };
}

export async function loadPlaygroundDraft(
    userId: string
): Promise<NewPlayground | null> {
    try {
        const stored = await runRequest<StoredDraft | undefined>(
            "readonly",
            (store) => store.get(getDraftKey(userId))
        );

        if (!stored?.playground) {
            return null;
        }

        if (Date.now() - stored.savedAt > DRAFT_MAX_AGE_MS) {
            await clearPlaygroundDraft(userId);
            return null;
        }

        const draft = normalizeDraft(stored.playground);

        return isPlaygroundDraftEmpty(draft) ? null : draft;
    } catch (error) {
        console.error("Не удалось загрузить черновик площадки:", error);
        return null;
    }
}

export async function savePlaygroundDraft(
    userId: string,
    playground: NewPlayground
): Promise<void> {
    try {
        const draft: StoredDraft = {
            savedAt: Date.now(),
            playground,
        };

        await runRequest("readwrite", (store) =>
            store.put(draft, getDraftKey(userId))
        );
    } catch (error) {
        console.error("Не удалось сохранить черновик площадки:", error);
    }
}

export async function clearPlaygroundDraft(
    userId: string
): Promise<void> {
    try {
        await runRequest("readwrite", (store) =>
            store.delete(getDraftKey(userId))
        );
    } catch (error) {
        console.error("Не удалось удалить черновик площадки:", error);
    }
}
