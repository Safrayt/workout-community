import { apiFetch } from "./client";
import { dataUrlToFile, isDataUrl } from "./imageUpload";
import {
    mapApiEventToEvent,
    mapApiRegistrationToRegistration,
    mapNewEventToApi,
    type ApiEvent,
    type ApiEventRegistration,
} from "./mappers/event";

import type { Event } from "../types/event";
import type { NewEvent } from "../types/newEvent";
import type { EventRegistration } from "../types/eventRegistration";

export async function listEvents(): Promise<Event[]> {
    const apiEvents = await apiFetch<ApiEvent[]>("/events/");

    return apiEvents.map(mapApiEventToEvent);
}

export async function getEvent(id: string): Promise<Event> {
    const apiEvent = await apiFetch<ApiEvent>(`/events/${id}`);

    return mapApiEventToEvent(apiEvent);
}

/**
 * Афиша грузится отдельным multipart-запросом (см. комментарий в
 * api/mappers/event.ts) — эта функция вызывается уже после того, как
 * само мероприятие создано/обновлено и у него точно есть id.
 */
async function uploadPosterIfNeeded(
    eventId: string,
    posterUrl: string
): Promise<void> {
    if (!isDataUrl(posterUrl)) {
        return;
    }

    const file = dataUrlToFile(posterUrl, "poster.jpg");
    const formData = new FormData();
    formData.set("file", file);

    await apiFetch(`/events/${eventId}/poster`, {
        method: "POST",
        body: formData,
    });
}

export async function createEvent(event: NewEvent): Promise<Event> {
    const apiEvent = await apiFetch<ApiEvent>("/events/", {
        method: "POST",
        body: mapNewEventToApi(event),
    });

    if (event.posterUrl) {
        await uploadPosterIfNeeded(String(apiEvent.id), event.posterUrl);

        return getEvent(String(apiEvent.id));
    }

    return mapApiEventToEvent(apiEvent);
}

export async function updateEvent(
    id: string,
    event: NewEvent,
    existingEvent: Event
): Promise<Event> {
    await apiFetch<ApiEvent>(`/events/${id}`, {
        method: "PUT",
        body: mapNewEventToApi(event),
    });

    const hadPoster = Boolean(existingEvent.posterUrl);
    const wantsPoster = Boolean(event.posterUrl);

    if (wantsPoster && isDataUrl(event.posterUrl)) {
        // Новая афиша выбрана в форме — грузим.
        await uploadPosterIfNeeded(id, event.posterUrl);
    } else if (hadPoster && !wantsPoster) {
        // Афишу убрали в форме — удаляем на сервере.
        await apiFetch(`/events/${id}/poster`, { method: "DELETE" });
    }

    return getEvent(id);
}

export async function deleteEvent(id: string): Promise<void> {
    await apiFetch(`/events/${id}`, { method: "DELETE" });
}

export async function listAllRegistrations(): Promise<
    EventRegistration[]
> {
    const apiRegistrations = await apiFetch<ApiEventRegistration[]>(
        "/events/registrations"
    );

    return apiRegistrations.map(mapApiRegistrationToRegistration);
}

export async function registerForEvent(
    eventId: string
): Promise<EventRegistration> {
    const apiRegistration = await apiFetch<ApiEventRegistration>(
        `/events/${eventId}/register`,
        { method: "POST" }
    );

    return mapApiRegistrationToRegistration(apiRegistration);
}

export async function cancelEventRegistration(
    eventId: string
): Promise<void> {
    await apiFetch(`/events/${eventId}/register`, { method: "DELETE" });
}
