import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../../styles/components/workout-entry-create.css";

import WorkoutEntryForm from "../../components/WorkoutEntryForm/WorkoutEntryForm";
import DraftNotice from "../../components/DraftNotice/DraftNotice";

import type {
    NewWorkoutEntry,
} from "../../types/newWorkoutEntry";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

import { useCurrentUser } from "../../context/CurrentUserContext";
import { useFormDraft } from "../../hooks/useFormDraft";
import {
    createEmptyWorkoutEntry,
    getWorkoutDraftKey,
    isWorkoutDraftEmpty,
    normalizeWorkoutDraft,
} from "../../utils/diaryDraft";

import { ApiError } from "../../api/errors";

/**
 * Новая запись о тренировке. Введённое автоматически сохраняется
 * черновиком на этом устройстве (см. hooks/useFormDraft.ts): его можно
 * продолжить после перехода на другую страницу или закрытия браузера.
 * Черновик удаляется после успешного сохранения записи или по кнопке
 * «Начать заново».
 */
export default function AddWorkoutEntry() {
    const {
        addEntry,
    } = useWorkoutDiary();

    const navigate =
        useNavigate();

    const { currentUser } = useCurrentUser();

    const draft = useFormDraft<NewWorkoutEntry>({
        storageKey: getWorkoutDraftKey(currentUser.id),
        createEmpty: createEmptyWorkoutEntry,
        normalize: normalizeWorkoutDraft,
        isEmpty: isWorkoutDraftEmpty,
    });

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(
        entry: NewWorkoutEntry
    ) {
        setError(null);
        setIsSubmitting(true);

        try {
            await addEntry(entry);

            // Запись сохранена — черновик больше не нужен.
            await draft.markSubmitted();

            navigate("/diary");
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось сохранить запись. Попробуйте ещё раз."
            );
            setIsSubmitting(false);
        }
    }

    async function handleDiscardDraft() {
        const confirmed = window.confirm(
            "Удалить черновик и начать заполнение заново? " +
            "Введённые данные и загруженные фотографии будут потеряны."
        );

        if (!confirmed) {
            return;
        }

        setError(null);
        await draft.discard();
    }

    return (
        <div className="workout-entry-create">

            {/* Back Navigation (UX §4) */}
            <Link
                to="/diary/create"
                className="workout-entry-create__back"
            >
                ← Добавить запись
            </Link>

            {/* Hero (UX §5) — не должен занимать много места */}
            <header className="workout-entry-create__hero">
                <p className="workout-entry-create__eyebrow">
                    Дневник
                </p>

                <h1 className="workout-entry-create__title">
                    Новая запись
                </h1>

                <p className="workout-entry-create__subtitle">
                    Расскажи о своей тренировке
                </p>
            </header>

            {error && (
                <p className="auth-form__error" role="alert">
                    {error}
                </p>
            )}

            {
                draft.initialValue === null ? (
                    <p className="playground-draft-hint">Загружаем…</p>
                ) : (
                    <>
                        <DraftNotice
                            isRestored={draft.isRestored}
                            onDiscard={handleDiscardDraft}
                            disabled={isSubmitting}
                        />

                        <WorkoutEntryForm
                            key={draft.formKey}
                            initialValue={draft.initialValue}
                            submitLabel={isSubmitting ? "Сохраняем…" : "Сохранить запись"}
                            onSubmit={handleSubmit}
                            onChange={draft.handleChange}
                            onCancel={() => navigate("/diary/create")}
                        />
                    </>
                )
            }

        </div>
    );
}
