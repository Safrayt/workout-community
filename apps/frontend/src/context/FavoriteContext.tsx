import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import type {
    PlaygroundFavorite,
} from "../types/favorite";

import {
    addFavoritePlayground,
    listFavorites,
    removeFavoritePlayground,
} from "../api/social";

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
    ) => Promise<void>;

    removeFavorite: (
        playgroundId: string
    ) => Promise<void>;

    toggleFavorite: (
        playgroundId: string
    ) => Promise<void>;

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
    ] = useState<PlaygroundFavorite[]>([]);


    const {
        currentUser,
    } = useCurrentUser();

    const currentUserId =
        currentUser.id;


    useEffect(() => {
        listFavorites()
            .then(setFavorites)
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить избранное:",
                    error
                );
            });
    }, []);


    async function addFavorite(
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

        const newFavorite =
            await addFavoritePlayground(playgroundId);

        setFavorites(
            (previous) => [
                ...previous,
                newFavorite,
            ]
        );
    }



    async function removeFavorite(
        playgroundId: string
    ) {
        await removeFavoritePlayground(playgroundId);

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



    async function toggleFavorite(
        playgroundId: string
    ) {
        if (
            isPlaygroundFavorited(
                favorites,
                currentUserId,
                playgroundId
            )
        ) {
            await removeFavorite(playgroundId);

            return;
        }

        await addFavorite(playgroundId);
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
