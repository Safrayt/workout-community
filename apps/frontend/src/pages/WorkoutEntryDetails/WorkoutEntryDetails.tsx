import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import InfoSection from "../../components/ui/InfoSection/InfoSection";
import InfoRow from "../../components/ui/InfoRow/InfoRow";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";
import TagBadge from "../../components/ui/TagBadge/TagBadge";

import WorkoutEntryForm from "../../components/WorkoutEntryForm/WorkoutEntryForm";

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
    getWorkoutEntryById,
} from "../../utils/workoutEntries";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

import { formatWorkoutEntryDate } from "../../utils/formatWorkoutEntryDate";
import { getTimeOfDayName } from "../../utils/timeOfDay";

import "../../styles/components/workout-entry-description.css";

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
            <Section title="Тренировка">
                <p>
                    Запись не найдена.
                </p>
            </Section>
        );
    }

    const entryId = entry.id;

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
            "Удалить эту тренировку? Это действие нельзя отменить."
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
        <Section title={entry.title}>

            <InfoSection title="Тренировка">

                <InfoRow label="Дата">
                    {formatWorkoutEntryDate(entry.date)}
                </InfoRow>

                {
                    entry.timeOfDay && (
                        <InfoRow label="Время суток">
                            {getTimeOfDayName(entry.timeOfDay)}
                        </InfoRow>
                    )
                }

                <InfoRow label="Площадка">
                    {
                        playground
                            ? (
                                <Link
                                    to={`/playgrounds/${playground.id}`}
                                >
                                    {playground.name}
                                </Link>
                            )
                            : "Не указана"
                    }
                </InfoRow>

            </InfoSection>

            {
                entry.description && (
                    <div className="workout-entry-description">
                        <strong className="workout-entry-description__label">
                            Описание:
                        </strong>

                        <p className="workout-entry-description__text">
                            {entry.description}
                        </p>
                    </div>
                )
            }

            {
                entry.tags && entry.tags.length > 0 && (
                    <InfoSection title="Теги">
                        <div className="tag-list">
                            {
                                entry.tags.map(
                                    (tag) => (
                                        <TagBadge
                                            key={tag}
                                            label={tag}
                                        />
                                    )
                                )
                            }
                        </div>
                    </InfoSection>
                )
            }

            <ActionGroup>
                <Button
                    onClick={() =>
                        setMode("edit")
                    }
                >
                    Редактировать
                </Button>
            </ActionGroup>

        </Section>
    );
}