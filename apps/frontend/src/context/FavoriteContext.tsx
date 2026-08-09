import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

import type {
    PlaygroundFavorite,
} from "../types/favorite";

import {
    favorites as initialFavorites,
} from "../data/favorites";

import {
    useCurrentUser,
} from "./CurrentUserContext";

import {
    isPlaygroundFavorited,
} from "../utils/favorites";


type FavoriteContextType = {
    favorites: PlaygroundFavorite[];

    addFavorite: (
        playgroundId: string
    ) => void;

    removeFavorite: (
        playgroundId: string
    ) => void;

    toggleFavorite: (
        playgroundId: string
    ) => void;

    checkFavorite: (
        playgroundId: string
    ) => boolean;
};


const FavoriteContext =
    createContext<
        FavoriteContextType | undefined
    >(undefined);



export function FavoriteProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [
        favorites,
        setFavorites,
    ] = useState<PlaygroundFavorite[]>(
        initialFavorites
    );


    const {
        currentUser,
    } = useCurrentUser();

    const currentUserId =
        currentUser.id;



    function addFavorite(
        playgroundId: string
    ) {
        if (
            isPlaygroundFavorited(
                favorites,
                currentUserId,
                playgroundId
            )
        ) {
            return;
        }


        const newFavorite: PlaygroundFavorite =
        {
            id: crypto.randomUUID(),

            userId: currentUserId,

            playgroundId,

            createdAt:
                new Date().toISOString(),
        };


        setFavorites(
            (previous) => [
                ...previous,
                newFavorite,
            ]
        );
    }



    function removeFavorite(
        playgroundId: string
    ) {
        setFavorites(
            (previous) =>
                previous.filter(
                    (favorite) =>
                        !(
                            favorite.userId === currentUserId &&
                            favorite.playgroundId === playgroundId
                        )
                )
        );
    }



    function toggleFavorite(
        playgroundId: string
    ) {
        if (
            isPlaygroundFavorited(
                favorites,
                currentUserId,
                playgroundId
            )
        ) {
            removeFavorite(playgroundId);

            return;
        }

        addFavorite(playgroundId);
    }



    function checkFavorite(
        playgroundId: string
    ) {
        return isPlaygroundFavorited(
            favorites,
            currentUserId,
            playgroundId
        );
    }



    return (
        <FavoriteContext.Provider
            value={{
                favorites,
                addFavorite,
                removeFavorite,
                toggleFavorite,
                checkFavorite,
            }}
        >
            {children}
        </FavoriteContext.Provider>
    );
}



export function useFavorites() {
    const context =
        useContext(
            FavoriteContext
        );


    if (!context) {
        throw new Error(
            "useFavorites must be used inside FavoriteProvider"
        );
    }


    return context;
}
