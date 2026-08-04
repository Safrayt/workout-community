import {
    createContext,
    useContext,
    useState,
} from "react";

import type { Playground } from "../types/playground";

import { playgrounds as initialPlaygrounds } from "../data/playgrounds";
import type { NewPlayground } from "../types/newPlayground";


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


    function addPlayground(
        playground: NewPlayground
    ) {
        const newPlayground: Playground = {
            id: crypto.randomUUID(),

            creatorId: "1",

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

            equipment: playground.equipment,

            photos: playground.photos,

            openingHours:
                playground.openingHours.trim().length > 0
                    ? playground.openingHours
                    : "Не указано",
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
                current.map((existing) =>
                    existing.id === id
                        ? {
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

                            equipment: playground.equipment,

                            photos: playground.photos,

                            openingHours:
                                playground.openingHours.trim().length > 0
                                    ? playground.openingHours
                                    : existing.openingHours,
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