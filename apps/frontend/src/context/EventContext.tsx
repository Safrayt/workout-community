import {
    createContext,
    useContext,
    useState,
} from "react";

import type {
    Event,
} from "../types/event";

import type {
    NewEvent,
} from "../types/newEvent";

import {
    events as initialEvents,
} from "../data/events";

import {
    usePlaygrounds,
} from "./PlaygroundContext";

import {
    useCurrentUser,
} from "./CurrentUserContext";

type EventContextType = {
    events: Event[];

    addEvent: (
        event: NewEvent
    ) => Event;

    updateEvent: (
        id: string,
        event: NewEvent
    ) => void;

    deleteEvent: (
        id: string
    ) => void;
};

const EventContext =
    createContext<
        EventContextType | undefined
    >(undefined);


export function EventProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [
        events,
        setEvents,
    ] = useState(
        initialEvents
    );

    const {
    currentUser,
} = useCurrentUser();

    const {
        playgrounds,
    } = usePlaygrounds();

    function addEvent(
        event: NewEvent
    ) {
        const playground =
            playgrounds.find(
                (item) =>
                    item.id === event.playgroundId
            );

        if (!playground) {
            throw new Error(
                "Playground not found."
            );
        }

        const newEvent: Event = {
            id: crypto.randomUUID(),

            creatorId: currentUser.id,

            title: event.title,

            description: event.description,

            city: playground.locality,

            location: playground.address,

            playgroundId: event.playgroundId,

            startDate: event.startDate,

            expectedParticipants: 0,

            posterUrl:
                event.posterUrl.trim().length > 0
                    ? event.posterUrl
                    : undefined,
        };

        setEvents(
            (current) => [
                ...current,
                newEvent,
            ]
        );

        return newEvent;
    }

    function updateEvent(
        id: string,
        event: NewEvent
    ) {
        const playground =
            playgrounds.find(
                (item) =>
                    item.id === event.playgroundId
            );

        if (!playground) {
            throw new Error(
                "Playground not found."
            );
        }

        setEvents(
            (current) =>
                current.map((existing) =>
                    existing.id === id
                        ? {
                            ...existing,

                            title: event.title,

                            description: event.description,

                            city: playground.locality,

                            location: playground.address,

                            playgroundId: event.playgroundId,

                            startDate: event.startDate,

                            posterUrl:
                                event.posterUrl.trim().length > 0
                                    ? event.posterUrl
                                    : undefined,
                        }
                        : existing
                )
        );
    }

    function deleteEvent(
        id: string
    ) {
        setEvents(
            (current) =>
                current.filter(
                    (event) => event.id !== id
                )
        );
    }

    return (
        <EventContext.Provider
            value={{
                events,
                addEvent,
                updateEvent,
                deleteEvent,
            }}
        >
            {children}
        </EventContext.Provider>
    );
}

export function useEvents() {
    const context =
        useContext(
            EventContext
        );

    if (!context) {
        throw new Error(
            "useEvents must be used inside EventProvider"
        );
    }

    return context;
}