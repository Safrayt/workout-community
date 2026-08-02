import Section from "../../components/ui/Section/Section";
import Input from "../../components/ui/Input/Input";
import Textarea from "../../components/ui/Textarea/Textarea";
import Select from "../../components/ui/Select/Select";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";

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
import { useNavigate } from "react-router-dom";

import type {
    NewEvent,
} from "../../types/newEvent";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";
import {
    useEvents,
} from "../../context/EventContext";

import {
    getPlaygroundOptions,
} from "../../utils/playgrounds";


export default function CreateEvent() {
    const [errors, setErrors] =
    useState<ValidationError[]>([]);

    const [
        event,
        setEvent,
    ] = useState<NewEvent>({
        title: "",
        description: "",
        playgroundId: "",
        startDate: "",
    });

    const {
        playgrounds,
    } = usePlaygrounds();

    const {
    addEvent,
    } = useEvents();

    const navigate =
        useNavigate();

    const playgroundOptions =
        getPlaygroundOptions(
            playgrounds
        );

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
        const createdEvent =
            addEvent(event);

        navigate(
            `/events/${createdEvent.id}`
        );
    }

    return (
        <Section title="Создание мероприятия">
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
            <Select
                id="playground"
                label="Площадка"
                options={playgroundOptions}
                value={event.playgroundId}
                error={
                    getFieldError(
                        errors,
                        "playgroundId"
                    )
                }
                onChange={(e) =>
                    updateField(
                        "playgroundId",
                        e.target.value
                    )
                }
            />
            <Input
                id="startDate"
                label="Дата"
                type="datetime-local"
                className="input__field--datetime"
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
                    Создать мероприятие
                </Button>
            </ActionGroup>

        </Section>
    );
}