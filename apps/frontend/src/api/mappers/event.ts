import type { Event } from "../../types/event";
import type { NewEvent } from "../../types/newEvent";
import type {
    EventRegistration,
    RegistrationStatus,
} from "../../types/eventRegistration";

import { resolveMediaUrl } from "../media";

export type ApiEvent = {
    id: number;
    title: string;
    description: string;
    start_date: string;
    poster_url: string | null;
    playground_id: number;
    creator_id: number;
    city: string;
    location: string;
    created_at: string;
    expected_participants: number;
};

export type ApiEventRegistration = {
    id: number;
    user_id: number;
    event_id: number;
    registered_at: string;
    status: RegistrationStatus;
    experience_awarded: number;
};

export function mapApiEventToEvent(apiEvent: ApiEvent): Event {
    return {
        id: String(apiEvent.id),
        title: apiEvent.title,
        description: apiEvent.description,
        city: apiEvent.city,
        location: apiEvent.location,
        playgroundId: String(apiEvent.playground_id),
        creatorId: String(apiEvent.creator_id),
        startDate: apiEvent.start_date,
        expectedParticipants: apiEvent.expected_participants,
        posterUrl: resolveMediaUrl(apiEvent.poster_url),
    };
}

/**
 * NewEvent -> тело POST/PUT /events. posterUrl сюда намеренно не
 * входит — афиша грузится отдельным multipart-запросом на
 * /events/{id}/poster (см. api/events.ts), а не как строка в этом
 * теле, чтобы не пихать base64-картинку в текстовую колонку в базе.
 */
export function mapNewEventToApi(
    event: Pick<NewEvent, "title" | "description" | "playgroundId" | "startDate">
): Record<string, unknown> {
    return {
        title: event.title,
        description: event.description,
        playground_id: Number(event.playgroundId),
        start_date: event.startDate,
    };
}

export function mapApiRegistrationToRegistration(
    apiRegistration: ApiEventRegistration
): EventRegistration {
    return {
        id: String(apiRegistration.id),
        userId: String(apiRegistration.user_id),
        eventId: String(apiRegistration.event_id),
        registeredAt: apiRegistration.registered_at,
        status: apiRegistration.status,
        experienceAwarded: apiRegistration.experience_awarded,
    };
}
