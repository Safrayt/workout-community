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

    function handleSubmit(
        entry: NewWorkoutEntry
    ) {
        addEntry(entry);

        navigate("/diary");
    }

    return (
        <div className="workout-entry-create">

            {/* Back Navigation (UX §4) */}
            <Link
                to="/diary"
                className="workout-entry-create__back"
            >
                ← Дневник
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

            <WorkoutEntryForm
                initialValue={createEmptyEntry()}
                submitLabel="Сохранить запись"
                onSubmit={handleSubmit}
                onCancel={() => navigate("/diary")}
            />

        </div>
    );
}
