import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../../styles/components/workout-entry-create.css";

import WorkoutEntryForm from "../../components/WorkoutEntryForm/WorkoutEntryForm";

import type {
    NewWorkoutEntry,
} from "../../types/newWorkoutEntry";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

import {
    getTodayDateString,
} from "../../utils/today";

import { ApiError } from "../../api/errors";

function createEmptyEntry(): NewWorkoutEntry {
    return {
        // По умолчанию подставляем сегодняшнюю дату — так пользователю
        // почти никогда не придётся трогать это поле (UX-DIARY-CREATE §7).
        date: getTodayDateString(),
        timeOfDay: "",
        playgroundId: "",
        title: "",
        description: "",
        photos: [],
        tags: [],
    };
}

export default function AddWorkoutEntry() {
    const {
        addEntry,
    } = useWorkoutDiary();

    const navigate =
        useNavigate();

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(
        entry: NewWorkoutEntry
    ) {
        setError(null);
        setIsSubmitting(true);

        try {
            await addEntry(entry);
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

            <WorkoutEntryForm
                initialValue={createEmptyEntry()}
                submitLabel={isSubmitting ? "Сохраняем…" : "Сохранить запись"}
                onSubmit={handleSubmit}
                onCancel={() => navigate("/diary/create")}
            />

        </div>
    );
}
