import Section from "../ui/Section/Section";
import Input from "../ui/Input/Input";
import Textarea from "../ui/Textarea/Textarea";
import Select from "../ui/Select/Select";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";
import WorkoutEntryPhotoUpload from "../WorkoutEntryPhotoUpload/WorkoutEntryPhotoUpload";
import TagsField from "../TagsField/TagsField";

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
    useCurrentUser,
} from "../../context/CurrentUserContext";

import {
    usePersonalTags,
} from "../../context/PersonalTagsContext";

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
    MAX_TAGS_PER_ENTRY,
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

    const {
        currentUser,
    } = useCurrentUser();

    const {
        registerUsedTags,
        tags: personalTags,
    } = usePersonalTags();

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

    // Источник — личный справочник тегов (PersonalTagsContext), а
    // не только теги, реально встречающиеся в записях. Иначе тег,
    // созданный на странице "Мои теги" без единого использования,
    // не появился бы здесь для выбора.
    const existingTags =
        personalTags
            .filter((tag) => tag.userId === currentUser.id)
            .map((tag) => tag.name)
            .sort((a, b) => a.localeCompare(b, "ru"));

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

            // Теги, введённые прямо здесь (минуя "Мои теги"),
            // всё равно должны попасть в личный справочник тегов
            // пользователя (UX-PERSONAL-TAGS §39, §47).
            registerUsedTags(
                currentUser.id,
                entry.tags
            );
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
                <TagsField
                    tags={entry.tags}
                    existingTags={existingTags}
                    maxTags={MAX_TAGS_PER_ENTRY}
                    onChange={(tags) =>
                        updateField("tags", tags)
                    }
                />
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
