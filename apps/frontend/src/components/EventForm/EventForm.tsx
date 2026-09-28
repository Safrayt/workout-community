import Input from "../ui/Input/Input";
import Textarea from "../ui/Textarea/Textarea";
import ActionGroup from "../ui/ActionGroup/ActionGroup";
import Button from "../ui/Button/Button";

import PlaygroundsMap from "../Map/PlaygroundsMap";
import SelectedPlaygroundPreview from "../SelectedPlaygroundPreview/SelectedPlaygroundPreview";
import EventPosterUpload from "../EventPosterUpload/EventPosterUpload";

import type {
    ValidationError,
} from "../../validation";
import {
    validateEvent,
} from "../../validation/event";

import {
    getFieldError,
} from "../../utils/validation.ts";

import { useState } from "react";

import type {
    NewEvent,
} from "../../types/newEvent";

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
    getNowDateTimeLocalString,
} from "../../utils/today";

type EventFormProps = {
    initialValue: NewEvent;

    submitLabel: string;

    onSubmit: (
        event: NewEvent
    ) => void;
};

export default function EventForm({
    initialValue,
    submitLabel,
    onSubmit,
}: EventFormProps) {
    const [errors, setErrors] =
        useState<ValidationError[]>([]);

    const [
        event,
        setEvent,
    ] = useState<NewEvent>(
        initialValue
    );

    const {
        playgrounds,
    } = usePlaygrounds();

    const selectedPlayground =
        event.playgroundId
            ? getPlaygroundById(
                playgrounds,
                event.playgroundId
            )
            : undefined;

    function updateField<K extends keyof NewEvent>(
        field: K,
        value: NewEvent[K]
    ) {
        setEvent(
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
            validateEvent(event);

        if (!result.valid) {
            setErrors(
                result.errors
            );

            return;
        }

        setErrors([]);

        onSubmit(event);
    }

    return (
        <>
            <Input
                id="title"
                label="Название"
                placeholder="Например, Общая тренировка"
                value={event.title}
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

            <p className="input__label">
                Площадка
            </p>

            <PlaygroundsMap
                markers={getPlaygroundMarkers(playgrounds)}
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

            {
                getFieldError(errors, "playgroundId") && (
                    <small className="input__error">
                        {getFieldError(errors, "playgroundId")}
                    </small>
                )
            }

            {
                selectedPlayground && (
                    <SelectedPlaygroundPreview
                        playground={selectedPlayground}
                    />
                )
            }

            <Input
                id="startDate"
                label="Дата"
                type="datetime-local"
                className="input__field--datetime"
                min={getNowDateTimeLocalString()}
                value={event.startDate}
                error={
                    getFieldError(
                        errors,
                        "startDate"
                    )
                }
                onChange={(e) =>
                    updateField(
                        "startDate",
                        e.target.value
                    )
                }
            />
            <p className="input__label">
                Афиша
            </p>

            <EventPosterUpload
                posterUrl={event.posterUrl}
                onChange={(posterUrl) =>
                    updateField(
                        "posterUrl",
                        posterUrl
                    )
                }
            />

            <Textarea
                id="description"
                label="Описание"
                placeholder="Расскажите, что будет на тренировке"
                value={event.description}
                error={
                    getFieldError(
                        errors,
                        "description"
                    )
                }
                onChange={(e) =>
                    updateField(
                        "description",
                        e.target.value
                    )
                }
            />

            <ActionGroup>
                <Button
                    onClick={handleSubmit}
                >
                    {submitLabel}
                </Button>
            </ActionGroup>
        </>
    );
}