import Section from "../ui/Section/Section";
import Input from "../ui/Input/Input";
import Textarea from "../ui/Textarea/Textarea";
import Select from "../ui/Select/Select";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";
import TagBadge from "../ui/TagBadge/TagBadge";
import WorkoutEntryPhotoUpload from "../WorkoutEntryPhotoUpload/WorkoutEntryPhotoUpload";

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
import SelectedPlaygroundPreview from "../SelectedPlaygroundPreview/SelectedPlaygroundPreview";

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
    MAX_WORKOUT_ENTRY_PHOTOS,
} from "../../constants/workoutEntryPhotos";

import {
    getTodayDateString,
} from "../../utils/today";

import "../../styles/components/workout-entry-form.css";
import "../../styles/components/workout-entry-map-picker.css";

import type { ReactNode } from "react";

type WorkoutEntryFormProps = {
    /**
     * Заголовок над формой (например, "Редактирование записи").
     * Используется только режимом редактирования — у страницы
     * создания записи свой Hero, живущий на уровне страницы (UX §5).
     */
    heading?: string;

    initialValue: NewWorkoutEntry;

    submitLabel: string;

    onSubmit: (entry: NewWorkoutEntry) => void;

    /** Кнопка/действие "Отмена" (UX §24–25). */
    onCancel?: () => void;

    extraActions?: ReactNode;
};

/**
 * Форма записи дневника — используется и для создания (AddWorkoutEntry),
 * и для редактирования (WorkoutEntryDetails, режим edit) записи.
 *
 * Разбита на смысловые секции согласно UX-DIARY-CREATE §3, §23, §37:
 * "Когда" → "Тренировка" → "Место" → "Теги" → действия. Так форма
 * читается как последовательный рассказ о тренировке, а не как
 * длинная безликая анкета.
 */
export default function WorkoutEntryForm({
    heading,
    initialValue,
    submitLabel,
    onSubmit,
    onCancel,
    extraActions,
}: WorkoutEntryFormProps) {
    const [errors, setErrors] =
        useState<ValidationError[]>([]);

    const [submitError, setSubmitError] =
        useState<string | null>(null);

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

    const availableExistingTags =
        existingTags.filter(
            (tag) => !entry.tags.includes(tag)
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

    function addExistingTag(tag: string) {
        if (entry.tags.includes(tag)) {
            return;
        }

        if (entry.tags.length >= MAX_TAGS_PER_ENTRY) {
            setTagError(
                `Можно добавить не более ${MAX_TAGS_PER_ENTRY} тегов на тренировку.`
            );

            return;
        }

        updateField(
            "tags",
            [...entry.tags, tag]
        );

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

        // Форма не должна очищаться при ошибке сохранения — все
        // введённые данные остаются на месте (UX §27).
        try {
            setSubmitError(null);
            onSubmit(entry);
        } catch {
            setSubmitError(
                "Не удалось сохранить запись. Попробуйте ещё раз."
            );
        }
    }

    return (
        <div className="workout-entry-form">

            {
                heading && (
                    <h1 className="workout-entry-form__heading">
                        {heading}
                    </h1>
                )
            }

            <Section title="Когда">
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
                    label="Время суток"
                    emptyOptionLabel="Не указано"
                    options={timeOfDayOptions}
                    value={entry.timeOfDay}
                    onChange={(e) =>
                        updateField(
                            "timeOfDay",
                            e.target.value
                        )
                    }
                />
            </Section>

            <Section title="Тренировка">
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

                <Textarea
                    id="description"
                    label="Что делал?"
                    placeholder="Расскажи, как прошла тренировка"
                    value={entry.description}
                    onChange={(e) =>
                        updateField(
                            "description",
                            e.target.value
                        )
                    }
                />

                <div className="input">
                    <label className="input__label">
                        Фотографии (необязательно)
                    </label>

                    <WorkoutEntryPhotoUpload
                        photos={entry.photos}
                        maxPhotos={MAX_WORKOUT_ENTRY_PHOTOS}
                        error={
                            getFieldError(
                                errors,
                                "photos"
                            )
                        }
                        onChange={(photos) =>
                            updateField(
                                "photos",
                                photos
                            )
                        }
                    />
                </div>
            </Section>

            <Section title="Где тренировался?">
                <p className="workout-entry-form__section-lead">
                    Площадка (необязательно)
                </p>

                <div className="workout-entry-map">
                    <PlaygroundsMap
                        markers={playgroundMarkers}
                        height="var(--workout-entry-map-height, 350px)"
                        showDetailsLink={false}
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
                </div>

                {
                    selectedPlayground ? (
                        <div className="workout-entry-selected-playground">
                            <SelectedPlaygroundPreview
                                playground={selectedPlayground}
                            />

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
                        </div>
                    ) : (
                        <p className="workout-entry-selected-playground__hint">
                            Нажмите на площадку на карте, чтобы выбрать её
                        </p>
                    )
                }
            </Section>

            <Section title="Теги">
                <div className="input">
                    <label
                        className="input__label"
                        htmlFor="tagInput"
                    >
                        {`Личные теги (${entry.tags.length}/${MAX_TAGS_PER_ENTRY})`}
                    </label>

                    {
                        availableExistingTags.length > 0 && (
                            <div className="workout-entry-tag-suggestions">
                                <p className="workout-entry-tag-suggestions__label">
                                    Ваши теги — нажмите, чтобы прикрепить
                                </p>

                                <div className="tag-list">
                                    {
                                        availableExistingTags.map(
                                            (tag) => (
                                                <TagBadge
                                                    key={tag}
                                                    label={tag}
                                                    onClick={() =>
                                                        addExistingTag(tag)
                                                    }
                                                />
                                            )
                                        )
                                    }
                                </div>
                            </div>
                        )
                    }

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
            </Section>

            {
                submitError && (
                    <p className="workout-entry-form__submit-error">
                        {submitError}
                    </p>
                )
            }

            <div className="workout-entry-form__actions">
                <ActionGroup>
                    <Button
                        onClick={handleSubmit}
                    >
                        {submitLabel}
                    </Button>

                    {
                        onCancel && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onCancel}
                            >
                                Отмена
                            </Button>
                        )
                    }

                    {extraActions}
                </ActionGroup>
            </div>

        </div>
    );
}
