import Section from "../../components/ui/Section/Section";
import Input from "../../components/ui/Input/Input";
import Textarea from "../../components/ui/Textarea/Textarea";
import Select from "../../components/ui/Select/Select";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    getPlaygroundOptions,
} from "../../utils/playgrounds";

import {
    timeOfDayOptions,
} from "../../utils/timeOfDay";

export default function AddWorkoutEntry() {
    const [errors, setErrors] =
        useState<ValidationError[]>([]);

    const [
        entry,
        setEntry,
    ] = useState<NewWorkoutEntry>({
        date: "",
        timeOfDay: "",
        playgroundId: "",
        title: "",
        description: "",
    });

    const {
        addEntry,
    } = useWorkoutDiary();

    const {
        playgrounds,
    } = usePlaygrounds();

    const navigate =
        useNavigate();

    const playgroundOptions =
        getPlaygroundOptions(
            playgrounds
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
        addEntry(entry);

        navigate("/diary");
    }

    return (
        <Section title="Новая запись">
            <Input
                id="date"
                label="Дата"
                type="date"
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
            <Select
                id="playground"
                label="Площадка (необязательно)"
                options={playgroundOptions}
                value={entry.playgroundId}
                onChange={(e) =>
                    updateField(
                        "playgroundId",
                        e.target.value
                    )
                }
            />
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
            <ActionGroup>
                <Button
                    onClick={handleSubmit}
                >
                    Сохранить запись
                </Button>
            </ActionGroup>
        </Section>
    );
}