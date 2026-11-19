import type { CompletionResultFields } from "./complexRunResult";

/**
 * Результат комплекса из помощника, который ждёт сохранения новой записи
 * дневника: выполнение комплекса нужно привязать к записи, а записи ещё
 * нет — пользователь делает её после тренировки. Хранится на устройстве,
 * пока запись не сохранена (форма записи может закрыться и открыться
 * снова — черновик записи тоже хранится). Устаревает через двое суток,
 * чтобы забытый результат не прикрепился к чужой записи спустя время.
 */
export type PendingComplexResult = CompletionResultFields & {
    complexId: string;
    complexName: string;
    createdAt: number;
};

const MAX_AGE_MS = 48 * 60 * 60 * 1000;

const RESULT_KEYS = [
    "resultTimeSeconds",
    "resultReps",
    "resultDurationSeconds",
    "resultSets",
    "resultRounds",
    "resultCount",
] as const;

function storageKey(userId: string | number): string {
    return `swo:pending-complex-result:${userId}`;
}

function isPending(value: unknown): value is PendingComplexResult {
    if (!value || typeof value !== "object") {
        return false;
    }

    const raw = value as Record<string, unknown>;

    return (
        typeof raw.complexId === "string" &&
        typeof raw.complexName === "string" &&
        typeof raw.createdAt === "number" &&
        RESULT_KEYS.every(
            (key) => raw[key] === undefined || typeof raw[key] === "number"
        )
    );
}

/** Результат из состояния адреса (location.state), переданный помощником. */
export function parsePendingComplexResult(
    state: unknown
): PendingComplexResult | null {
    if (!state || typeof state !== "object") {
        return null;
    }

    const raw = (state as { complexCompletion?: unknown }).complexCompletion;

    if (!raw || typeof raw !== "object") {
        return null;
    }

    const candidate = { createdAt: Date.now(), ...(raw as object) };

    return isPending(candidate) ? candidate : null;
}

export function readPendingComplexResult(
    userId: string | number
): PendingComplexResult | null {
    try {
        const raw = window.localStorage.getItem(storageKey(userId));

        if (!raw) {
            return null;
        }

        const parsed: unknown = JSON.parse(raw);

        if (!isPending(parsed) || Date.now() - parsed.createdAt > MAX_AGE_MS) {
            window.localStorage.removeItem(storageKey(userId));
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

export function writePendingComplexResult(
    userId: string | number,
    result: PendingComplexResult
): void {
    try {
        window.localStorage.setItem(storageKey(userId), JSON.stringify(result));
    } catch {
        // Хранилище недоступно — результат останется только в этой вкладке.
    }
}

export function clearPendingComplexResult(userId: string | number): void {
    try {
        window.localStorage.removeItem(storageKey(userId));
    } catch {
        // Нечего чистить.
    }
}
