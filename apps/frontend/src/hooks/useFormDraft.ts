import { useCallback, useEffect, useRef, useState } from "react";

import {
    clearFormDraft,
    loadFormDraft,
    saveFormDraft,
} from "../utils/formDraftStorage";

/** Пауза после последнего изменения, прежде чем писать черновик. */
const DRAFT_SAVE_DELAY_MS = 400;

type UseFormDraftParams<T> = {
    /** Ключ черновика: вид формы + id пользователя. */
    storageKey: string;

    /** Пустая форма (с теми значениями по умолчанию, что у новой записи). */
    createEmpty: () => T;

    /** Приводит черновик, сохранённый старой версией формы, к актуальным полям. */
    normalize: (raw: Partial<T>) => T;

    /** Пустая форма — это и есть «нет черновика»: такое не сохраняем. */
    isEmpty: (value: T) => boolean;
};

export type FormDraft<T> = {
    /** null — черновик ещё загружается из хранилища. */
    initialValue: T | null;

    /** Форма открыта с восстановленным черновиком. */
    isRestored: boolean;

    /** Меняется при «Начать заново» — повесьте на форму как key, чтобы она создалась заново. */
    formKey: number;

    /** Передайте форме в onChange: запоминает последнее состояние для автосохранения. */
    handleChange: (value: T) => void;

    /** «Начать заново»: удаляет черновик и пустит форму с чистого листа. */
    discard: () => Promise<void>;

    /** Запись отправлена — черновик удаляется и больше не пишется. */
    markSubmitted: () => Promise<void>;
};

/**
 * Автосохранение черновика формы создания: всё, что пользователь уже
 * ввёл (включая фото), сохраняется в его браузере и подставляется при
 * следующем открытии страницы — после перехода на другую страницу или
 * закрытия браузера. Работает так же, как черновик добавления
 * площадки (pages/AddPlayground).
 *
 * - запись в хранилище — через 400 мс после последнего изменения;
 * - остаток, не успевший записаться, пишется сразу при уходе со
 *   страницы и когда вкладка скрывается или закрывается;
 * - после успешной отправки черновик удаляется.
 */
export function useFormDraft<T>({
    storageKey,
    createEmpty,
    normalize,
    isEmpty,
}: UseFormDraftParams<T>): FormDraft<T> {
    const [initialValue, setInitialValue] = useState<T | null>(null);
    const [isRestored, setIsRestored] = useState(false);
    const [formKey, setFormKey] = useState(0);

    const saveTimerRef = useRef<number | undefined>(undefined);
    const pendingRef = useRef<T | null>(null);
    const isSubmittedRef = useRef(false);

    // Актуальные версии функций — в ref, чтобы эффекты не перезапускались
    // из-за того, что вызывающий создаёт их заново при каждом рендере.
    const paramsRef = useRef({ storageKey, createEmpty, normalize, isEmpty });

    useEffect(() => {
        paramsRef.current = { storageKey, createEmpty, normalize, isEmpty };
    });

    useEffect(() => {
        let cancelled = false;

        loadFormDraft<T>(
            storageKey,
            (raw) => paramsRef.current.normalize(raw),
            (value) => paramsRef.current.isEmpty(value)
        ).then((draft) => {
            if (cancelled) {
                return;
            }

            setInitialValue(draft ?? paramsRef.current.createEmpty());
            setIsRestored(draft !== null);
        });

        return () => {
            cancelled = true;
        };
    }, [storageKey]);

    // Записывает последнее отложенное изменение немедленно.
    const flush = useCallback(() => {
        window.clearTimeout(saveTimerRef.current);

        const pending = pendingRef.current;
        pendingRef.current = null;

        if (!pending || isSubmittedRef.current) {
            return;
        }

        const { storageKey: key, isEmpty: isEmptyValue } = paramsRef.current;

        if (isEmptyValue(pending)) {
            void clearFormDraft(key);
        } else {
            void saveFormDraft(key, pending);
        }
    }, []);

    useEffect(() => {
        function handleVisibilityChange() {
            if (document.visibilityState === "hidden") {
                flush();
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", flush);

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
            window.removeEventListener("pagehide", flush);

            // Уход на другую страницу внутри приложения.
            flush();
        };
    }, [flush]);

    const handleChange = useCallback(
        (value: T) => {
            if (isSubmittedRef.current) {
                return;
            }

            pendingRef.current = value;

            window.clearTimeout(saveTimerRef.current);
            saveTimerRef.current = window.setTimeout(flush, DRAFT_SAVE_DELAY_MS);
        },
        [flush]
    );

    const discard = useCallback(async () => {
        window.clearTimeout(saveTimerRef.current);
        pendingRef.current = null;

        await clearFormDraft(paramsRef.current.storageKey);

        setInitialValue(paramsRef.current.createEmpty());
        setIsRestored(false);
        setFormKey((current) => current + 1);
    }, []);

    const markSubmitted = useCallback(async () => {
        // Флаг — до очистки, чтобы отложенное сохранение не записало
        // черновик обратно.
        isSubmittedRef.current = true;
        window.clearTimeout(saveTimerRef.current);
        pendingRef.current = null;

        await clearFormDraft(paramsRef.current.storageKey);
    }, []);

    return {
        initialValue,
        isRestored,
        formKey,
        handleChange,
        discard,
        markSubmitted,
    };
}
