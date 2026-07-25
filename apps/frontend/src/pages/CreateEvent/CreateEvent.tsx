import Section from "../../components/ui/Section/Section";
import FormSection from "../../components/ui/FormSection/FormSection";
import Input from "../../components/ui/Input/Input";
import Textarea from "../../components/ui/Textarea/Textarea";
import Select from "../../components/ui/Select/Select";
import ActionGroup from "../../components/ui/ActionGroup/ActionGroup";
import Button from "../../components/ui/Button/Button";

import { useState } from "react";

import type {
    NewEvent,
} from "../../types/newEvent";

import {
    usePlaygrounds,
} from "../../context/PlaygroundContext";

import {
    getPlaygroundOptions,
} from "../../utils/playgrounds";


export default function CreateEvent() {
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

    const playgroundOptions =
        getPlaygroundOptions(
            playgrounds
        );

    function updateField<
        K extends keyof NewEvent
    >(
        field: K,
        value: NewEvent[K]
    ) {
        setEvent(
            (current) => ({
                ...current,
                [field]: value,
            })
        );
    }
    return (
        <Section title="Создание мероприятия">
            <Input
                id="title"
                label="Название"
                placeholder="Например, Общая тренировка"
                value={event.title}
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
                value={event.startDate}
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
                onChange={(e) =>
                    updateField(
                        "description",
                        e.target.value
                    )
                }
            />
            <ActionGroup>
                <Button>
                    Создать мероприятие
                </Button>
            </ActionGroup>

        </Section>
    );
}

