import { useNavigate, useParams } from "react-router-dom";

import Section from "../../components/ui/Section/Section";
import EventForm from "../../components/EventForm/EventForm";

import { useEvents } from "../../context/EventContext";
import { useCurrentUser } from "../../context/CurrentUserContext";

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

    function handleSubmit(
        formValue: NewEvent
    ) {
        if (!event) {
            return;
        }

        updateEvent(
            event.id,
            formValue
        );

        navigate(
            `/events/${event.id}`
        );
    }

    return (
        <Section title={`Редактирование: ${event.title}`}>
            <EventForm
                initialValue={eventToFormValue(event)}
                submitLabel="Сохранить изменения"
                onSubmit={handleSubmit}
            />
        </Section>
    );
}