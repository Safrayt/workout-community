import { useState } from "react";

import Section from "../../components/ui/Section/Section";
import EventForm from "../../components/EventForm/EventForm";

import { useNavigate } from "react-router-dom";
import { ApiError } from "../../api/errors";

import type {
    NewEvent,
} from "../../types/newEvent";

import {
    useEvents,
} from "../../context/EventContext";

import {
    useRegistration,
} from "../../context/RegistrationContext";

export default function CreateEvent() {
    const {
        addEvent,
    } = useEvents();

    const {
        register,
    } = useRegistration();

    const navigate =
        useNavigate();

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(
        event: NewEvent
    ) {
        setError(null);
        setIsSubmitting(true);

        try {
            const createdEvent =
                await addEvent(event);

            // Создатель события считается его первым участником —
            // отдельного блока "Создатель события" на странице нет,
            // создатель просто виден в общем списке участников.
            await register(createdEvent.id);

            navigate(
                `/events/${createdEvent.id}`
            );
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось создать мероприятие. Попробуйте ещё раз."
            );
            setIsSubmitting(false);
        }
    }

    return (
        <Section title="Создание мероприятия">
            {error && (
                <p className="auth-form__error" role="alert">
                    {error}
                </p>
            )}

            <EventForm
                initialValue={{
                    title: "",
                    description: "",
                    playgroundId: "",
                    startDate: "",
                    posterUrl: "",
                }}
                submitLabel={
                    isSubmitting ? "Создаём…" : "Создать мероприятие"
                }
                onSubmit={handleSubmit}
            />
        </Section>
    );
}