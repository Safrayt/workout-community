import { useState } from "react";

import type {
    EventRegistration,
} from "../types/eventRegistration";

import {
    isUserRegistered,
} from "../utils/registration";

import {
    registrations as initialRegistrations,
} from "../data/registrations";

import { currentUser } from "../data/currentUser";


export function useEventRegistration() {
    const [registrations, setRegistrations] =
        useState<EventRegistration[]>(
            initialRegistrations
        );


    const currentUserId = currentUser.id;


    function register(eventId: string) {
        if (
            isUserRegistered(
                registrations,
                currentUserId,
                eventId
            )
        ) {
            return;
        }


        const newRegistration: EventRegistration = {
            id: crypto.randomUUID(),

            userId: currentUserId,

            eventId,

            registeredAt:
                new Date().toISOString(),

            status: "registered",

            experienceAwarded: 0,
        };


        setRegistrations((previous) => [
            ...previous,
            newRegistration,
        ]);
    }


    function cancel(eventId: string) {
        setRegistrations((previous) =>
            previous.filter(
                (registration) =>
                    !(
                        registration.userId === currentUserId &&
                        registration.eventId === eventId
                    )
            )
        );
    }


    function checkRegistration(eventId: string) {
        return isUserRegistered(
            registrations,
            currentUserId,
            eventId
        );
    }


    return {
        registrations,

        register,

        cancel,

        checkRegistration,
    };
}