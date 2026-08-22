import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import EventForm from "../../components/EventForm/EventForm";

import { useEvents } from "../../context/EventContext";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { ApiError } from "../../api/errors";

import { getEventById } from "../../utils/events";
import { eventToFormValue } from "../../utils/eventForm";

import type { NewEvent } from "../../types/newEvent";

export default function EditEvent() {
    const { id } = useParams();

    const {
        events,
        updateEvent,
    } = useEvents();

    const { currentUser } =
        useCurrentUser();

    const navigate =
        useNavigate();

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const event =
        id
            ? getEventById(
                events,
                id
            )
            : undefined;

    if (!event) {
        return (
            <Section title="Мероприятие">
                <p>
                    Мероприятие не найдено.
                </p>
            </Section>
        );
    }

    if (event.creatorId !== currentUser.id) {
        return (
            <Section title="Редактирование мероприятия">
                <p>
                    У вас нет прав на редактирование этого мероприятия.
                </p>
            </Section>
        );
    }

    async function handleSubmit(
        formValue: NewEvent
    ) {
        if (!event) {
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            await updateEvent(
                event.id,
                formValue
            );

            navigate(
                `/events/${event.id}`
            );
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Не удалось сохранить изменения. Попробуйте ещё раз."
            );
            setIsSubmitting(false);
        }
    }

    return (
        <Section title={`Редактирование: ${event.title}`}>
            {error && (
                <p className="auth-form__error" role="alert">
                    {error}
                </p>
            )}

            <EventForm
                initialValue={eventToFormValue(event)}
                submitLabel={
                    isSubmitting ? "Сохраняем…" : "Сохранить изменения"
                }
                onSubmit={handleSubmit}
            />
        </Section>
    );
}