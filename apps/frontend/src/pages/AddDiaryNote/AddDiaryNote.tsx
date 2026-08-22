import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../../styles/components/workout-entry-create.css";

import DiaryNoteForm from "../../components/DiaryNoteForm/DiaryNoteForm";

import type {
    NewDiaryNote,
} from "../../types/newDiaryNote";

import {
    useDiaryNotes,
} from "../../context/DiaryNotesContext";

import { ApiError } from "../../api/errors";

function createEmptyNote(): NewDiaryNote {
    return {
        title: "",
        text: "",
        photos: [],
        playgroundId: "",
        tags: [],
    };
}

export default function AddDiaryNote() {
    const {
        addNote,
    } = useDiaryNotes();

    const navigate =
        useNavigate();

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(
        note: NewDiaryNote
    ) {
        setError(null);
        setIsSubmitting(true);

        try {
            await addNote(note);
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

            <DiaryNoteForm
                initialValue={createEmptyNote()}
                submitLabel={isSubmitting ? "Сохраняем…" : "Сохранить заметку"}
                onSubmit={handleSubmit}
                onCancel={() => navigate("/diary/create")}
            />

        </div>
    );
}
