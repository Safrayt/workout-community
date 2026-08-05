import Section from "../../components/ui/Section/Section";
import EventForm from "../../components/EventForm/EventForm";

import { useNavigate } from "react-router-dom";

import type {
    NewEvent,
} from "../../types/newEvent";

import {
    useEvents,
} from "../../context/EventContext";

export default function CreateEvent() {
    const {
        addEvent,
    } = useEvents();

    const navigate =
        useNavigate();

    function handleSubmit(
        event: NewEvent
    ) {
        const createdEvent =
            addEvent(event);

        navigate(
            `/events/${createdEvent.id}`
        );
    }

    return (
        <Section title="Создание мероприятия">
            <EventForm
                initialValue={{
                    title: "",
                    description: "",
                    playgroundId: "",
                    startDate: "",
                    posterUrl: "",
                }}
                submitLabel="Создать мероприятие"
                onSubmit={handleSubmit}
            />
        </Section>
    );
}