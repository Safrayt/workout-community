import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import "../../styles/components/workout-entry-details.css";

import Button from "../../components/ui/Button/Button";

import WorkoutEntryForm from "../../components/WorkoutEntryForm/WorkoutEntryForm";
import WorkoutEntryHero from "../../components/WorkoutEntryHero/WorkoutEntryHero";
import WorkoutEntryQuickFacts from "../../components/WorkoutEntryQuickFacts/WorkoutEntryQuickFacts";
import WorkoutEntryContent from "../../components/WorkoutEntryContent/WorkoutEntryContent";
import WorkoutEntryTags from "../../components/WorkoutEntryTags/WorkoutEntryTags";
import WorkoutEntryPlaygroundPreview from "../../components/WorkoutEntryPlaygroundPreview/WorkoutEntryPlaygroundPreview";
import WorkoutEntryActions from "../../components/WorkoutEntryActions/WorkoutEntryActions";
import WorkoutEntryNotFound from "../../components/WorkoutEntryNotFound/WorkoutEntryNotFound";

import type {
    NewWorkoutEntry,
} from "../../types/newWorkoutEntry";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import {
    getWorkoutEntryById,
} from "../../utils/workoutEntries";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

export default function WorkoutEntryDetails() {
    const { id } = useParams();

    const [mode, setMode] =
        useState<"view" | "edit">("view");

    const {
        entries,
        updateEntry,
        deleteEntry,
    } = useWorkoutDiary();

    const {
        playgrounds,
    } = usePlaygrounds();

    const {
        currentUser,
    } = useCurrentUser();

    const navigate =
        useNavigate();

    const entry =
        id
            ? getWorkoutEntryById(
                entries,
                id
            )
            : undefined;

    if (!entry) {
        return (
            <WorkoutEntryNotFound />
        );
    }

    const entryId = entry.id;

    const isOwner =
        entry.userId === currentUser.id;

    const playground =
        entry.playgroundId
            ? getPlaygroundById(
                playgrounds,
                entry.playgroundId
            )
            : undefined;

    function handleSubmit(
        updated: NewWorkoutEntry
    ) {
        updateEntry(
            entryId,
            updated
        );

        setMode("view");
    }

    function handleDelete() {
        const confirmed = window.confirm(
            "Удалить эту запись? Это действие нельзя отменить."
        );

        if (!confirmed) {
            return;
        }

        deleteEntry(entryId);

        navigate("/diary");
    }

    if (mode === "edit") {
        const initialValue: NewWorkoutEntry = {
            date: entry.date,
            timeOfDay: entry.timeOfDay ?? "",
            playgroundId: entry.playgroundId ?? "",
            title: entry.title,
            description: entry.description ?? "",
            tags: entry.tags ?? [],
        };

        return (
            <WorkoutEntryForm
                title="Редактирование записи"
                initialValue={initialValue}
                submitLabel="Сохранить изменения"
                onSubmit={handleSubmit}
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

            {/* Back Navigation (UX §6) */}
            <Link
                to="/diary"
                className="workout-entry-details__back"
            >
                ← Дневник
            </Link>

            {/* Hero — заголовок записи (UX §7–9) */}
            <WorkoutEntryHero
                entry={entry}
            />

            {/* Quick Facts — только реально существующие сведения (UX §10) */}
            <WorkoutEntryQuickFacts
                entry={entry}
            />

            {/* Главный контент — текст записи (UX §11–13) */}
            <WorkoutEntryContent
                description={entry.description}
            />

            {/* Второстепенный блок тегов (UX §14–15) */}
            <WorkoutEntryTags
                tags={entry.tags}
            />

            {/* Компактный preview площадки (UX §16–18, §27) */}
            <WorkoutEntryPlaygroundPreview
                playgroundId={entry.playgroundId}
                playground={playground}
            />

            {/* Действия доступны только владельцу записи (UX §19, §22) */}
            <WorkoutEntryActions
                isOwner={isOwner}
                onEdit={() => setMode("edit")}
                onDelete={handleDelete}
            />

        </div>
    );
}
