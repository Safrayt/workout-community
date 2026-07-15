import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

import type {
    EventRegistration,
} from "../types/eventRegistration";

import {
    registrations as initialRegistrations,
} from "../data/registrations";

import { currentUser } from "../data/currentUser";

import {
    isUserRegistered,
} from "../utils/registration";


type RegistrationContextType = {
    registrations: EventRegistration[];

    register: (
        eventId: string
    ) => void;

    cancel: (
        eventId: string
    ) => void;

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
    ] = useState<EventRegistration[]>(
        initialRegistrations
    );


    const currentUserId =
        currentUser.id;



    function register(
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


        const newRegistration: EventRegistration =
        {
            id: crypto.randomUUID(),

            userId: currentUserId,

            eventId,

            registeredAt:
                new Date().toISOString(),

            status: "registered",

            experienceAwarded: 0,
        };


        setRegistrations(
            (previous) => [
                ...previous,
                newRegistration,
            ]
        );
    }



    function cancel(
        eventId: string
    ) {
        setRegistrations(
            (previous) =>
                previous.filter(
                    (registration) =>
                        !(
                            registration.userId === currentUserId &&
                            registration.eventId === eventId
                        )
                )
        );
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