import "../../styles/components/event-poster.css";

import type { Event } from "../../types/event";
import type { Playground } from "../../types/playground";

import { getEventPosterUrl } from "../../utils/eventPoster";

type EventPosterProps = {
    event: Event;

    playground: Playground | undefined;
};

export default function EventPoster({
    event,
    playground,
}: EventPosterProps) {
    const imageUrl =
        getEventPosterUrl(
            event.posterUrl,
            playground
        );

    if (!imageUrl) {
        return null;
    }

    return (
        <div className="event-poster">
            <img
                src={imageUrl}
                alt={event.title}
                className="event-poster__image"
            />
        </div>
    );
}