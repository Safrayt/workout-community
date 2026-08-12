import type { Playground } from "../types/playground";
import type { Event } from "../types/event";
import type { MapMarker } from "../types/map";

import {
    sortEventsAscending,
    sortEventsDescending,
} from "./events";
import { formatEventDateShort } from "./formatEventDate";
import { pluralizeRu } from "./pluralize";


/**
 * Маркеры для "Карты событий": площадки, на которых есть события из
 * переданного списка — этот список уже должен быть отфильтрован по
 * текущим фильтрам страницы (дата/статус), чтобы карта показывала
 * только то, что соответствует выбранным фильтрам.
 *
 * `order` определяет и сортировку внутри площадки, и подпись в
 * попапе: для предстоящих — "Ближайшее" (раньше даты выше), для
 * завершённых — "Последнее" (позже даты выше).
 */
export function getEventPlaygroundMarkers(
    playgrounds: Playground[],
    events: Event[],
    order: "asc" | "desc" = "asc"
): MapMarker[] {
    const eventsByPlayground = new Map<string, Event[]>();

    for (const event of events) {
        const playgroundEvents =
            eventsByPlayground.get(event.playgroundId) ?? [];

        playgroundEvents.push(event);

        eventsByPlayground.set(
            event.playgroundId,
            playgroundEvents
        );
    }

    const labelPrefix =
        order === "asc"
            ? "Ближайшее"
            : "Последнее";

    return playgrounds
        .filter(
            (playground) =>
                eventsByPlayground.has(playground.id)
        )
        .map(
            (playground) => {
                const sortEvents =
                    order === "asc"
                        ? sortEventsAscending
                        : sortEventsDescending;

                const playgroundEvents = sortEvents(
                    eventsByPlayground.get(playground.id) ?? []
                );

                const topEvent = playgroundEvents[0];

                return {
                    id: playground.id,

                    title: playground.name,

                    latitude:
                        playground.coordinates.latitude,

                    longitude:
                        playground.coordinates.longitude,

                    url: `/events/${topEvent.id}`,

                    photoUrl:
                        playground.photos.find(
                            (photo) => photo.isMain
                        )?.url ??
                        playground.photos[0]?.url,

                    locality: playground.locality,

                    shortInfo:
                        playgroundEvents.length > 1
                            ? `${labelPrefix}: ${formatEventDateShort(topEvent.startDate)} · ещё ${playgroundEvents.length - 1} ${pluralizeRu(playgroundEvents.length - 1, ["событие", "события", "событий"])}`
                            : `${labelPrefix}: ${formatEventDateShort(topEvent.startDate)}`,
                };
            }
        );
}
