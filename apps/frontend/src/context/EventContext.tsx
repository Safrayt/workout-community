import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import type { Event } from "../types/event";
import type { NewEvent } from "../types/newEvent";

import {
    createEvent as apiCreateEvent,
    deleteEvent as apiDeleteEvent,
    listEvents,
    updateEvent as apiUpdateEvent,
} from "../api/events";

type EventContextType = {
    events: Event[];

    /** true, пока идёт самая первая загрузка списка с сервера. */
    isLoading: boolean;

    addEvent: (event: NewEvent) => Promise<Event>;

    updateEvent: (id: string, event: NewEvent) => Promise<Event>;

    deleteEvent: (id: string) => Promise<void>;

    /**
     * Перечитывает список мероприятий с сервера — используется
     * RegistrationContext после регистрации/отмены, чтобы
     * expectedParticipants (он вычисляется на бэкенде по таблице
     * регистраций) не оставался устаревшим в локальном кеше.
     */
    refreshEvents: () => Promise<void>;
};


const EventContext =
    createContext<EventContextType | undefined>(undefined);


export function EventProvider({
    children,
}: {
    children: React.ReactNode;
}) {

    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    async function refreshEvents(): Promise<void> {
        const fetched = await listEvents();
        setEvents(fetched);
    }

    useEffect(() => {
        listEvents()
            .then(setEvents)
            .catch((error: unknown) => {
                console.error("Не удалось загрузить мероприятия:", error);
            })
            .finally(() => setIsLoading(false));
    }, []);


    async function addEvent(event: NewEvent): Promise<Event> {
        const created = await apiCreateEvent(event);

        setEvents((current) => [...current, created]);

        return created;
    }


    async function updateEvent(
        id: string,
        event: NewEvent
    ): Promise<Event> {
        const existing = events.find((e) => e.id === id);

        if (!existing) {
            throw new Error(`Мероприятие ${id} не найдено в текущем списке`);
        }

        const updated = await apiUpdateEvent(id, event, existing);

        setEvents((current) =>
            current.map((e) => (e.id === id ? updated : e))
        );

        return updated;
    }


    async function deleteEvent(id: string): Promise<void> {
        await apiDeleteEvent(id);

        setEvents((current) => current.filter((event) => event.id !== id));
    }


    return (
        <EventContext.Provider
            value={{
                events,
                isLoading,
                addEvent,
                updateEvent,
                deleteEvent,
                refreshEvents,
            }}
        >
            {children}
        </EventContext.Provider>
    );
}


export function useEvents() {

    const context = useContext(EventContext);

    if (!context) {
        throw new Error("useEvents must be used inside EventProvider");
    }

    return context;
}
