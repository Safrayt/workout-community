import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../../styles/components/workout-entry-create.css";

import DiaryNoteForm from "../../components/DiaryNoteForm/DiaryNoteForm";
import DraftNotice from "../../components/DraftNotice/DraftNotice";

import type {
    NewDiaryNote,
} from "../../types/newDiaryNote";

import {
    useDiaryNotes,
} from "../../context/DiaryNotesContext";

import { useCurrentUser } from "../../context/CurrentUserContext";
import { useFormDraft } from "../../hooks/useFormDraft";
import {
    createEmptyDiaryNote,
    getNoteDraftKey,
    isNoteDraftEmpty,
    normalizeNoteDraft,
} from "../../utils/diaryDraft";

import { ApiError } from "../../api/errors";

/**
 * Новая заметка. Введённое автоматически сохраняется черновиком на этом
 * устройстве (см. hooks/useFormDraft.ts): его можно продолжить после
 * перехода на другую страницу или закрытия браузера. Черновик удаляется
 * после успешного сохранения заметки или по кнопке «Начать заново».
 */
export default function AddDiaryNote() {
    const {
        addNote,
    } = useDiaryNotes();

    const navigate =
        useNavigate();

    const { currentUser } = useCurrentUser();

    const draft = useFormDraft<NewDiaryNote>({
        storageKey: getNoteDraftKey(currentUser.id),
        createEmpty: createEmptyDiaryNote,
        normalize: normalizeNoteDraft,
        isEmpty: isNoteDraftEmpty,
    });

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(
        note: NewDiaryNote
    ) {
        setError(null);
        setIsSubmitting(true);

        try {
            await addNote(note);

            // Заметка сохранена — черновик больше не нужен.
            await draft.markSubmitted();

            navigate("/diary");
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось сохранить заметку. Попробуйте ещё раз."
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

            <Link
                to="/diary/create"
                className="workout-entry-create__back"
            >
                ← Добавить запись
            </Link>

            <header className="workout-entry-create__hero">
                <p className="workout-entry-create__eyebrow">
                    Дневник
                </p>

                <h1 className="workout-entry-create__title">
                    Новая заметка
                </h1>

                <p className="workout-entry-create__subtitle">
                    Прогресс, самочувствие, впечатления от площадки — что угодно
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

                        <DiaryNoteForm
                            key={draft.formKey}
                            initialValue={draft.initialValue}
                            submitLabel={isSubmitting ? "Сохраняем…" : "Сохранить заметку"}
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
