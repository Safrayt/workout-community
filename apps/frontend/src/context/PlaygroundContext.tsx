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

            coordinates: {
                latitude: 0,
                longitude: 0,
            },

            size: "medium",

            amenities: {
                lighting: false,
                covered: false,
                changingRoom: false,
                toilet: false,
                drinkingWater: false,
                shower: false,
                parking: false,
                bicycleParking: false,
            },

            surface: "ground",

            equipment: [],

            photos: [],

            openingHours: "Не указано",
        };

        setPlaygrounds(
            (current) => [
                ...current,
                newPlayground,
            ]
        );
        return newPlayground;
    }


    return (
        <PlaygroundContext.Provider
            value={{
                playgrounds,
                addPlayground,
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