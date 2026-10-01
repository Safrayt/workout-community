import { useEffect, useRef, useState } from "react";

import Section from "../../components/ui/Section/Section";
import Button from "../../components/ui/Button/Button";
import PlaygroundForm from "../../components/PlaygroundForm/PlaygroundForm";

import { usePlaygrounds } from "../../context/PlaygroundContext";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../api/errors";

import {
    clearPlaygroundDraft,
    createEmptyPlayground,
    isPlaygroundDraftEmpty,
    loadPlaygroundDraft,
    savePlaygroundDraft,
} from "../../utils/playgroundDraft";

import type {
    NewPlayground,
} from "../../types/newPlayground";

import "../../styles/components/playground-draft-notice.css";

/** Пауза после последнего изменения, прежде чем писать черновик. */
const DRAFT_SAVE_DELAY_MS = 400;

/**
 * Добавление площадки с автосохранением черновика: всё, что
 * пользователь уже ввёл (включая фото и метку на карте), сохраняется
 * в его браузере и подставляется при следующем открытии страницы.
 * Так можно остановиться, когда не хватает, например, фотографии,
 * и вернуться позже с того же места. Черновик удаляется после
 * успешного добавления площадки или по кнопке "Начать заново".
 */
export default function AddPlayground() {
    const {
        addPlayground,
    } = usePlaygrounds();

    const { currentUser } = useCurrentUser();
    const userId = currentUser.id;

    const navigate =
        useNavigate();

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // null — черновик ещё загружается из IndexedDB.
    const [initialValue, setInitialValue] =
        useState<NewPlayground | null>(null);
    const [isRestored, setIsRestored] = useState(false);
    const [formKey, setFormKey] = useState(0);

    const saveTimerRef = useRef<number | undefined>(undefined);
    const pendingRef = useRef<NewPlayground | null>(null);
    const isSubmittedRef = useRef(false);
    const flushRef = useRef<() => void>(() => {});

    useEffect(() => {
        let cancelled = false;

        loadPlaygroundDraft(userId).then((draft) => {
            if (cancelled) {
                return;
            }

            setInitialValue(draft ?? createEmptyPlayground());
            setIsRestored(draft !== null);
        });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    // Записывает последнее отложенное изменение немедленно. Нужна при
    // уходе со страницы и закрытии вкладки, чтобы не потерять правки,
    // сделанные за последние доли секунды до debounce.
    useEffect(() => {
        flushRef.current = () => {
            window.clearTimeout(saveTimerRef.current);

            const pending = pendingRef.current;
            pendingRef.current = null;

            if (!pending || isSubmittedRef.current) {
                return;
            }

            if (isPlaygroundDraftEmpty(pending)) {
                void clearPlaygroundDraft(userId);
            } else {
                void savePlaygroundDraft(userId, pending);
            }
        };
    }, [userId]);

    useEffect(() => {
        function handleVisibilityChange() {
            if (document.visibilityState === "hidden") {
                flushRef.current();
            }
        }

        function handlePageHide() {
            flushRef.current();
        }

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );
        window.addEventListener("pagehide", handlePageHide);

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
            window.removeEventListener("pagehide", handlePageHide);

            // Уход на другую страницу внутри приложения.
            flushRef.current();
        };
    }, []);

    function handleFormChange(playground: NewPlayground) {
        if (isSubmittedRef.current) {
            return;
        }

        pendingRef.current = playground;

        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
            () => flushRef.current(),
            DRAFT_SAVE_DELAY_MS
        );
    }

    async function handleDiscardDraft() {
        const confirmed = window.confirm(
            "Удалить черновик и начать заполнение заново? " +
            "Введённые данные и загруженные фотографии будут потеряны."
        );

        if (!confirmed) {
            return;
        }

        window.clearTimeout(saveTimerRef.current);
        pendingRef.current = null;

        await clearPlaygroundDraft(userId);

        setInitialValue(createEmptyPlayground());
        setIsRestored(false);
        setError(null);
        setFormKey((current) => current + 1);
    }

    async function handleSubmit(
        playground: NewPlayground
    ) {
        setError(null);
        setIsSubmitting(true);

        try {
            const createdPlayground =
                await addPlayground(playground);

            // Площадка создана — черновик больше не нужен. Флаг
            // выставляем до очистки, чтобы отложенное сохранение не
            // записало его обратно.
            isSubmittedRef.current = true;
            window.clearTimeout(saveTimerRef.current);
            pendingRef.current = null;

            await clearPlaygroundDraft(userId);

            navigate(
                `/playgrounds/${createdPlayground.id}`
            );
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось добавить площадку. Попробуйте ещё раз."
            );
            setIsSubmitting(false);
        }
    }

    if (initialValue === null) {
        return (
            <Section title="Добавление площадки">
                <p className="playground-draft-hint">
                    Загружаем…
                </p>
            </Section>
        );
    }

    return (
        <Section title="Добавление площадки">
            {isRestored ? (
                <div
                    className="playground-draft-notice"
                    role="status"
                >
                    <p className="playground-draft-notice__text">
                        Мы восстановили ваш черновик: можно продолжить
                        с того же места. Он сохраняется автоматически
                        на этом устройстве.
                    </p>

                    <Button
                        variant="outline"
                        onClick={handleDiscardDraft}
                        disabled={isSubmitting}
                    >
                        Начать заново
                    </Button>
                </div>
            ) : (
                <p className="playground-draft-hint">
                    Введённые данные сохраняются автоматически как
                    черновик — если не хватает, например, фотографий,
                    можно закрыть страницу и вернуться позже.
                </p>
            )}

            {error && (
                <p className="auth-form__error" role="alert">
                    {error}
                </p>
            )}

            <PlaygroundForm
                key={formKey}
                initialValue={initialValue}
                submitLabel={
                    isSubmitting ? "Добавляем…" : "Добавить площадку"
                }
                onSubmit={handleSubmit}
                onChange={handleFormChange}
            />
        </Section>
    );
}
