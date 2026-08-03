import Section from "../ui/Section/Section";
import Input from "../ui/Input/Input";
import Textarea from "../ui/Textarea/Textarea";
import Select from "../ui/Select/Select";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";
import TagBadge from "../ui/TagBadge/TagBadge";

import { useState } from "react";

import type {
    ValidationError,
} from "../../validation";
import {
    validateWorkoutEntry,
} from "../../validation/workoutEntry";

import {
    getFieldError,
} from "../../utils/validation.ts";

import type {
    NewWorkoutEntry,
} from "../../types/newWorkoutEntry";

import {
    useWorkoutDiary,
} from "../../context/WorkoutDiaryContext";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import PlaygroundsMap from "../Map/PlaygroundsMap";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

import {
    getPlaygroundMarkers,
} from "../../utils/maps";

import {
    timeOfDayOptions,
} from "../../utils/timeOfDay";

import {
    getUserTags,
    MAX_TAGS_PER_ENTRY,
    MAX_USER_TAGS,
} from "../../utils/workoutTags";

import {
    getTodayDateString,
} from "../../utils/today";

import "../../styles/components/workout-entry-map-picker.css";

import type { ReactNode } from "react";

type WorkoutEntryFormProps = {
    title: string;

    initialValue: NewWorkoutEntry;

    submitLabel: string;

    onSubmit: (entry: NewWorkoutEntry) => void;

    extraActions?: ReactNode;
};

export default function WorkoutEntryForm({
    title,
    initialValue,
    submitLabel,
    onSubmit,
    extraActions,
}: WorkoutEntryFormProps) {
    const [errors, setErrors] =
        useState<ValidationError[]>([]);

    const [
        entry,
        setEntry,
    ] = useState<NewWorkoutEntry>(
        initialValue
    );

    const [tagInput, setTagInput] =
        useState("");

    const [tagError, setTagError] =
        useState<string | null>(null);

    const {
        entries,
    } = useWorkoutDiary();

    const {
        currentUser,
    } = useCurrentUser();

    const {
        playgrounds,
    } = usePlaygrounds();

    const playgroundMarkers =
        getPlaygroundMarkers(
            playgrounds
        );

    const selectedPlayground =
        entry.playgroundId
            ? getPlaygroundById(
                playgrounds,
                entry.playgroundId
            )
            : undefined;

    const existingTags =
        getUserTags(
            entries,
            currentUser.id
        );

    function updateField<K extends keyof NewWorkoutEntry>(
        field: K,
        value: NewWorkoutEntry[K]
    ) {
        setEntry(
            (current) => ({
                ...current,
                [field]: value,
            })
        );

        setErrors(
            (current) =>
                current.filter(
                    (error) =>
                        error.field !== field
                )
        );
    }

    function addTag() {
        const trimmed = tagInput.trim();

        if (trimmed.length === 0) {
            return;
        }

        if (entry.tags.includes(trimmed)) {
            setTagInput("");
            return;
        }

        if (entry.tags.length >= MAX_TAGS_PER_ENTRY) {
            setTagError(
                `Можно добавить не более ${MAX_TAGS_PER_ENTRY} тегов на тренировку.`
            );

            return;
        }

        if (
            !existingTags.includes(trimmed) &&
            existingTags.length >= MAX_USER_TAGS
        ) {
            setTagError(
                `Достигнут лимит в ${MAX_USER_TAGS} личных тегов. Выберите один из уже созданных.`
            );

            return;
        }

        updateField(
            "tags",
            [...entry.tags, trimmed]
        );

        setTagInput("");
        setTagError(null);
    }

    function removeTag(tag: string) {
        updateField(
            "tags",
            entry.tags.filter(
                (item) => item !== tag
            )
        );
    }

    function handleSubmit() {
        const result =
            validateWorkoutEntry(entry);

        if (!result.valid) {
            setErrors(
                result.errors
            );

            return;
        }

        setErrors([]);
        onSubmit(entry);
    }

    return (
        <Section title={title}>
            <Input
                id="date"
                label="Дата"
                type="date"
                className="input__field--date"
                max={getTodayDateString()}
                value={entry.date}
                error={
                    getFieldError(
                        errors,
                        "date"
                    )
                }
                onChange={(e) =>
                    updateField(
                        "date",
                        e.target.value
                    )
                }
            />
            <Select
                id="timeOfDay"
                label="Время суток (необязательно)"
                options={timeOfDayOptions}
                value={entry.timeOfDay}
                onChange={(e) =>
                    updateField(
                        "timeOfDay",
                        e.target.value
                    )
                }
            />
            <Input
                id="title"
                label="Название"
                placeholder="Например, Утренняя тренировка"
                value={entry.title}
                error={
                    getFieldError(
                        errors,
                        "title"
                    )
                }
                onChange={(e) =>
                    updateField(
                        "title",
                        e.target.value
                    )
                }
            />
            <div className="input">
                <label className="input__label">
                    Площадка (необязательно)
                </label>

                <PlaygroundsMap
                    markers={playgroundMarkers}
                    height="350px"
                    selectedLatitude={
                        selectedPlayground?.coordinates.latitude
                    }
                    selectedLongitude={
                        selectedPlayground?.coordinates.longitude
                    }
                    onMarkerClick={(marker) =>
                        updateField(
                            "playgroundId",
                            marker.id
                        )
                    }
                />

                <p className="workout-entry-selected-playground">
                    {
                        selectedPlayground
                            ? `Выбрано: ${selectedPlayground.name}`
                            : "Нажмите на площадку на карте, чтобы выбрать её"
                    }

                    {
                        selectedPlayground && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    updateField(
                                        "playgroundId",
                                        ""
                                    )
                                }
                            >
                                Убрать
                            </Button>
                        )
                    }
                </p>
            </div>
            <Textarea
                id="description"
                label="Описание (необязательно)"
                placeholder="Что делал на тренировке"
                value={entry.description}
                onChange={(e) =>
                    updateField(
                        "description",
                        e.target.value
                    )
                }
            />

            <div className="input">
                <label
                    className="input__label"
                    htmlFor="tagInput"
                >
                    {`Личные теги (${entry.tags.length}/${MAX_TAGS_PER_ENTRY})`}
                </label>

                <div className="tag-input-row">
                    <Input
                        id="tagInput"
                        list="known-tags"
                        placeholder="Например, турник"
                        value={tagInput}
                        onChange={(e) =>
                            setTagInput(e.target.value)
                        }
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addTag();
                            }
                        }}
                    />

                    <datalist id="known-tags">
                        {
                            existingTags.map(
                                (tag) => (
                                    <option
                                        key={tag}
                                        value={tag}
                                    />
                                )
                            )
                        }
                    </datalist>

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={addTag}
                    >
                        Добавить
                    </Button>
                </div>

                {
                    tagError && (
                        <small className="input__error">
                            {tagError}
                        </small>
                    )
                }

                {
                    entry.tags.length > 0 && (
                        <div className="tag-list">
                            {
                                entry.tags.map(
                                    (tag) => (
                                        <TagBadge
                                            key={tag}
                                            label={tag}
                                            onRemove={() =>
                                                removeTag(tag)
                                            }
                                        />
                                    )
                                )
                            }
                        </div>
                    )
                }
            </div>

            <ActionGroup>
                <Button
                    onClick={handleSubmit}
                >
                    {submitLabel}
                </Button>

                {extraActions}
            </ActionGroup>
        </Section>
    );
}