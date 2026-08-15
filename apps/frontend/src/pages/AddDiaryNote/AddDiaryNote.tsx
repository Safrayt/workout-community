import { Link, useNavigate } from "react-router-dom";

import "../../styles/components/workout-entry-create.css";

import DiaryNoteForm from "../../components/DiaryNoteForm/DiaryNoteForm";

import type {
    NewDiaryNote,
} from "../../types/newDiaryNote";

import {
    useDiaryNotes,
} from "../../context/DiaryNotesContext";

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

    function handleSubmit(
        note: NewDiaryNote
    ) {
        addNote(note);

        navigate("/diary");
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

            <DiaryNoteForm
                initialValue={createEmptyNote()}
                submitLabel="Сохранить заметку"
                onSubmit={handleSubmit}
                onCancel={() => navigate("/diary/create")}
            />

        </div>
    );
}
