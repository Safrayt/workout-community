import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import type {
    EventRegistration,
} from "../types/eventRegistration";

import {
    cancelEventRegistration,
    listAllRegistrations,
    registerForEvent,
} from "../api/events";

import {
    useCurrentUser,
} from "./CurrentUserContext";

import {
    useEvents,
} from "./EventContext";

import {
    isUserRegistered,
} from "../utils/registration";


type RegistrationContextType = {
    registrations: EventRegistration[];

    register: (
        eventId: string
    ) => Promise<void>;

    cancel: (
        eventId: string
    ) => Promise<void>;

    checkRegistration: (
        eventId: string
    ) => boolean;
};


const RegistrationContext =
    createContext<
        RegistrationContextType | undefined
    >(undefined);



export function RegistrationProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [
        registrations,
        setRegistrations,
    ] = useState<EventRegistration[]>([]);

    const {
        currentUser,
    } = useCurrentUser();

    const currentUserId =
        currentUser.id;

    // refreshEvents живёт в EventContext — после регистрации/отмены
    // expectedParticipants на мероприятии (он считается на бэкенде
    // по этой же таблице регистраций) устареет в локальном кеше
    // EventContext, если его не перечитать. Поэтому RegistrationProvider
    // должен быть вложен внутрь EventProvider — см. ProtectedLayout.
    const { refreshEvents } = useEvents();

    useEffect(() => {
        listAllRegistrations()
            .then(setRegistrations)
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить регистрации:",
                    error
                );
            });
    }, []);


    async function register(
        eventId: string
    ) {
        if (
            isUserRegistered(
                registrations,
                currentUserId,
                eventId
            )
        ) {
            return;
        }

        const newRegistration =
            await registerForEvent(eventId);

        setRegistrations(
            (previous) => [
                ...previous.filter(
                    (r) =>
                        !(
                            r.userId === currentUserId &&
                            r.eventId === eventId
                        )
                ),
                newRegistration,
            ]
        );

        await refreshEvents();
    }



    async function cancel(
        eventId: string
    ) {
        await cancelEventRegistration(eventId);

        // Бэкенд не удаляет регистрацию, а помечает её status:
        // "cancelled" (см. cancel_registration в routers/events.py) —
        // отражаем то же самое локально, а не убираем запись из
        // массива целиком, чтобы не разойтись с сервером при
        // следующей перезагрузке страницы.
        setRegistrations(
            (previous) =>
                previous.map((registration) =>
                    registration.userId === currentUserId &&
                    registration.eventId === eventId
                        ? { ...registration, status: "cancelled" as const }
                        : registration
                )
        );

        await refreshEvents();
    }



    function checkRegistration(
        eventId: string
    ) {
        return isUserRegistered(
            registrations,
            currentUserId,
            eventId
        );
    }



    return (
        <RegistrationContext.Provider
            value={{
                registrations,
                register,
                cancel,
                checkRegistration,
            }}
        >
            {children}
        </RegistrationContext.Provider>
    );
}



export function useRegistration() {
    const context =
        useContext(
            RegistrationContext
        );


    if (!context) {
        throw new Error(
            "useRegistration must be used inside RegistrationProvider"
        );
    }


    return context;
}
