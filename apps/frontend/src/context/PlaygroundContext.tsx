import {
    createContext,
    useContext,
    useState,
} from "react";

import type { Playground } from "../types/playground";

import { playgrounds as initialPlaygrounds } from "../data/playgrounds";
import type { NewPlayground } from "../types/newPlayground";

import { useCurrentUser } from "./CurrentUserContext";

import { getChangedFields } from "../utils/playgroundHistory";


type PlaygroundContextType = {
    playgrounds: Playground[];

    addPlayground: (
        playground: NewPlayground
    ) => Playground;

    updatePlayground: (
        id: string,
        playground: NewPlayground
    ) => void;

    deletePlayground: (
        id: string
    ) => void;

    confirmPlaygroundInspection: (
        id: string
    ) => void;
};


const PlaygroundContext =
createContext<
    PlaygroundContextType | undefined
>(undefined);


export function PlaygroundProvider({
    children,
}: {
    children: React.ReactNode;
}) {

    const [
        playgrounds,
        setPlaygrounds
    ] = useState(
        initialPlaygrounds
    );

    const { currentUser } = useCurrentUser();


    function addPlayground(
        playground: NewPlayground
    ) {
        const now = new Date().toISOString();

        const newPlayground: Playground = {
            id: crypto.randomUUID(),

            creatorId: currentUser.id,

            name: playground.name,

            locality: playground.locality,

            address: playground.address,

            description: playground.description,

            coordinates:
                playground.coordinates ?? {
                    latitude: 0,
                    longitude: 0,
                },

            size:
                playground.size || "medium",

            amenities: playground.amenities,

            surface:
                playground.surface || "ground",

            access:
                playground.access || "free",

            accessRestrictions:
                playground.access === "limited"
                    ? playground.accessRestrictions
                    : undefined,

            condition:
                playground.condition || "acceptable",

            equipment: playground.equipment,

            photos: playground.photos,

            openingHours:
                playground.openingHours.trim().length > 0
                    ? playground.openingHours
                    : "Не указано",

            createdAt: now,

            updatedAt: now,

            history: [
                {
                    id: crypto.randomUUID(),
                    type: "created",
                    date: now,
                    userId: currentUser.id,
                    username: currentUser.nickname,
                },
            ],
        };

        setPlaygrounds(
            (current) => [
                ...current,
                newPlayground,
            ]
        );
        return newPlayground;
    }


    function updatePlayground(
        id: string,
        playground: NewPlayground
    ) {
        setPlaygrounds(
            (current) =>
                current.map((existing) => {

                    if (existing.id !== id) {
                        return existing;
                    }

                    const changedFields = getChangedFields(
                        existing,
                        playground
                    );

                    const now = new Date().toISOString();

                    return {
                        ...existing,

                        name: playground.name,

                        locality: playground.locality,

                        address: playground.address,

                        description: playground.description,

                        coordinates:
                            playground.coordinates ?? existing.coordinates,

                        size:
                            playground.size || existing.size,

                        amenities: playground.amenities,

                        surface:
                            playground.surface || existing.surface,

                        access:
                            playground.access || existing.access,

                        accessRestrictions:
                            playground.access === "limited"
                                ? playground.accessRestrictions
                                : (
                                    playground.access === "free"
                                        ? undefined
                                        : existing.accessRestrictions
                                ),

                        condition:
                            playground.condition || existing.condition,

                        equipment: playground.equipment,

                        photos: playground.photos,

                        openingHours:
                            playground.openingHours.trim().length > 0
                                ? playground.openingHours
                                : existing.openingHours,

                        updatedAt: now,

                        history:
                            changedFields.length > 0
                                ? [
                                    ...existing.history,
                                    {
                                        id: crypto.randomUUID(),
                                        type: "edit" as const,
                                        date: now,
                                        userId: currentUser.id,
                                        username: currentUser.nickname,
                                        changedFields,
                                    },
                                ]
                                : existing.history,
                    };

                })
        );
    }


    function confirmPlaygroundInspection(
        id: string
    ) {
        setPlaygrounds(
            (current) =>
                current.map((existing) =>
                    existing.id === id
                        ? {
                            ...existing,

                            history: [
                                ...existing.history,
                                {
                                    id: crypto.randomUUID(),
                                    type: "inspection" as const,
                                    date: new Date().toISOString(),
                                    userId: currentUser.id,
                                    username: currentUser.nickname,
                                },
                            ],
                        }
                        : existing
                )
        );
    }


    function deletePlayground(
        id: string
    ) {
        setPlaygrounds(
            (current) =>
                current.filter(
                    (playground) => playground.id !== id
                )
        );
    }


    return (
        <PlaygroundContext.Provider
            value={{
                playgrounds,
                addPlayground,
                updatePlayground,
                deletePlayground,
                confirmPlaygroundInspection,
            }}
        >
            {children}
        </PlaygroundContext.Provider>
    );
}


export function usePlaygrounds() {

    const context =
        useContext(
            PlaygroundContext
        );

    if (!context) {
        throw new Error(
            "usePlaygrounds must be used inside PlaygroundProvider"
        );
    }

    return context;
}
