import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import "../../styles/components/workout-entry-details.css";
import "../../styles/components/workout-entry-hero.css";

import DiaryNoteForm from "../../components/DiaryNoteForm/DiaryNoteForm";
import DiaryRecordTypeBadge from "../../components/DiaryRecordTypeBadge/DiaryRecordTypeBadge";
import Button from "../../components/ui/Button/Button";
import WorkoutEntryContent from "../../components/WorkoutEntryContent/WorkoutEntryContent";
import WorkoutEntryGallery from "../../components/WorkoutEntryGallery/WorkoutEntryGallery";
import WorkoutEntryTags from "../../components/WorkoutEntryTags/WorkoutEntryTags";
import WorkoutEntryPlaygroundPreview from "../../components/WorkoutEntryPlaygroundPreview/WorkoutEntryPlaygroundPreview";
import WorkoutEntryActions from "../../components/WorkoutEntryActions/WorkoutEntryActions";
import WorkoutEntryNotFound from "../../components/WorkoutEntryNotFound/WorkoutEntryNotFound";
import DiaryComments from "../../components/DiaryComments/DiaryComments";

import type {
    NewDiaryNote,
} from "../../types/newDiaryNote";

import {
    useDiaryNotes,
} from "../../context/DiaryNotesContext";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

/**
 * Страница заметки (UX-DIARY-V2 §16–19). Максимально переиспользует
 * уже готовые блоки записи тренировки (контент, галерея, теги,
 * превью площадки, действия, "не найдено") — заметка отличается
 * только Hero (заголовок опционален) и формой редактирования.
 */
export default function DiaryNoteDetails() {
    const { id } = useParams();

    const [mode, setMode] =
        useState<"view" | "edit">("view");

    const {
        notes,
        updateNote,
        deleteNote,
    } = useDiaryNotes();

    const {
        playgrounds,
    } = usePlaygrounds();

    const {
        currentUser,
    } = useCurrentUser();

    const navigate =
        useNavigate();

    const note =
        id
            ? notes.find((item) => item.id === id)
            : undefined;

    if (!note) {
        return (
            <WorkoutEntryNotFound />
        );
    }

    const noteId = note.id;

    const isOwner =
        note.userId === currentUser.id;

    const playground =
        note.playgroundId
            ? getPlaygroundById(
                playgrounds,
                note.playgroundId
            )
            : undefined;

    function handleSubmit(
        updated: NewDiaryNote
    ) {
        updateNote(
            noteId,
            updated
        );

        setMode("view");
    }

    function handleDelete() {
        const confirmed = window.confirm(
            "Удалить эту заметку? Это действие нельзя отменить."
        );

        if (!confirmed) {
            return;
        }

        deleteNote(noteId);

        navigate("/diary");
    }

    if (mode === "edit") {
        const initialValue: NewDiaryNote = {
            title: note.title ?? "",
            text: note.text,
            playgroundId: note.playgroundId ?? "",
            photos:
                note.photos?.map((photo) => ({
                    id: photo.id,
                    url: photo.url,
                    isMain: photo.isMain ?? false,
                })) ?? [],
            tags: note.tags ?? [],
        };

        return (
            <DiaryNoteForm
                heading="Редактирование заметки"
                initialValue={initialValue}
                submitLabel="Сохранить изменения"
                onSubmit={handleSubmit}
                onCancel={() => setMode("view")}
                extraActions={
                    <Button
                        type="button"
                        variant="danger"
                        onClick={handleDelete}
                    >
                        Удалить
                    </Button>
                }
            />
        );
    }

    return (
        <div className="workout-entry-details">

            <Link
                to="/diary"
                className="workout-entry-details__back"
            >
                ← Дневник
            </Link>

            <header className="workout-entry-hero">
                <DiaryRecordTypeBadge type="note" />

                <h1 className="workout-entry-hero__title">
                    {note.title ?? "Заметка"}
                </h1>
            </header>

            <WorkoutEntryContent
                description={note.text}
            />

            <WorkoutEntryGallery
                photos={note.photos}
            />

            <WorkoutEntryTags
                tags={note.tags}
            />

            <WorkoutEntryPlaygroundPreview
                playgroundId={note.playgroundId}
                playground={playground}
            />

            <WorkoutEntryActions
                isOwner={isOwner}
                onEdit={() => setMode("edit")}
                onDelete={handleDelete}
            />

            <DiaryComments
                recordId={note.id}
                recordType="note"
            />

        </div>
    );
}
