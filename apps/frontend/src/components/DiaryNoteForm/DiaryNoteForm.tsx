import { useState, type ReactNode } from "react";

import Section from "../ui/Section/Section";
import Input from "../ui/Input/Input";
import Textarea from "../ui/Textarea/Textarea";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";
import TagsField from "../TagsField/TagsField";
import WorkoutEntryPhotoUpload from "../WorkoutEntryPhotoUpload/WorkoutEntryPhotoUpload";
import PlaygroundsMap from "../Map/PlaygroundsMap";
import SelectedPlaygroundPreview from "../SelectedPlaygroundPreview/SelectedPlaygroundPreview";

import type {
    ValidationError,
} from "../../validation";
import {
    validateDiaryNote,
} from "../../validation/diaryNote";

import {
    getFieldError,
} from "../../utils/validation.ts";

import type {
    NewDiaryNote,
} from "../../types/newDiaryNote";

import {
    useCurrentUser,
} from "../../context/CurrentUserContext";

import {
    usePersonalTags,
} from "../../context/PersonalTagsContext";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    getPlaygroundById,
} from "../../utils/playgrounds";

import {
    getPlaygroundMarkers,
} from "../../utils/maps";

import {
    MAX_TAGS_PER_ENTRY,
} from "../../utils/workoutTags";

import {
    MAX_WORKOUT_ENTRY_PHOTOS,
} from "../../constants/workoutEntryPhotos";

import "../../styles/components/workout-entry-form.css";
import "../../styles/components/workout-entry-map-picker.css";

type DiaryNoteFormProps = {

    heading?: string;

    initialValue: NewDiaryNote;

    submitLabel: string;

    onSubmit: (note: NewDiaryNote) => void;

    onCancel?: () => void;

    extraActions?: ReactNode;

};

/**
 * Форма заметки (UX-DIARY-V2 §5). Намеренно свободная: единственное
 * обязательное поле — текст. Заголовок, фото, площадка, теги — все
 * необязательны (§19.5). Специальных полей вроде "настроение" или
 * "самочувствие" нет и не должно быть (§6) — всё это описывается
 * свободным текстом.
 */
export default function DiaryNoteForm({
    heading,
    initialValue,
    submitLabel,
    onSubmit,
    onCancel,
    extraActions,
}: DiaryNoteFormProps) {
    const [errors, setErrors] =
        useState<ValidationError[]>([]);

    const [submitError, setSubmitError] =
        useState<string | null>(null);

    const [note, setNote] =
        useState<NewDiaryNote>(initialValue);

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
        getPlaygroundMarkers(playgrounds);

    const selectedPlayground =
        note.playgroundId
            ? getPlaygroundById(playgrounds, note.playgroundId)
            : undefined;

    const existingTags =
        personalTags
            .filter((tag) => tag.userId === currentUser.id)
            .map((tag) => tag.name)
            .sort((a, b) => a.localeCompare(b, "ru"));

    function updateField<K extends keyof NewDiaryNote>(
        field: K,
        value: NewDiaryNote[K]
    ) {
        setNote(
            (current) => ({
                ...current,
                [field]: value,
            })
        );

        setErrors(
            (current) =>
                current.filter(
                    (error) => error.field !== field
                )
        );
    }

    function handleSubmit() {
        const result = validateDiaryNote(note);

        if (!result.valid) {
            setErrors(result.errors);
            return;
        }

        setErrors([]);

        try {
            setSubmitError(null);
            onSubmit(note);

            registerUsedTags(
                currentUser.id,
                note.tags
            );
        } catch {
            setSubmitError(
                "Не удалось сохранить заметку. Попробуйте ещё раз."
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

            <Section title="Заметка">
                <Input
                    id="noteTitle"
                    label="Заголовок (необязательно)"
                    placeholder="Например, Первый выход силой"
                    value={note.title}
                    error={
                        getFieldError(errors, "title")
                    }
                    onChange={(e) =>
                        updateField("title", e.target.value)
                    }
                />

                <Textarea
                    id="noteText"
                    label="Текст"
                    placeholder="О чём хочется рассказать? Прогресс, самочувствие, впечатления от площадки — что угодно."
                    value={note.text}
                    error={
                        getFieldError(errors, "text")
                    }
                    onChange={(e) =>
                        updateField("text", e.target.value)
                    }
                />

                <div className="input">
                    <label className="input__label">
                        Фотографии (необязательно)
                    </label>

                    <WorkoutEntryPhotoUpload
                        photos={note.photos}
                        maxPhotos={MAX_WORKOUT_ENTRY_PHOTOS}
                        error={
                            getFieldError(errors, "photos")
                        }
                        onChange={(photos) =>
                            updateField("photos", photos)
                        }
                    />
                </div>
            </Section>

            <Section title="Площадка">
                <p className="workout-entry-form__section-lead">
                    Связать заметку с площадкой (необязательно)
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
                            updateField("playgroundId", marker.id)
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
                                    updateField("playgroundId", "")
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
                    tags={note.tags}
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
                    <Button onClick={handleSubmit}>
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
