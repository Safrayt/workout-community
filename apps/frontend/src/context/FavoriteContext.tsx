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
    useAuth,
} from "./CurrentUserContext";

import { useLoginRedirect } from "../hooks/useLoginRedirect";

import {
    usePlaygrounds,
} from "./PlaygroundContext";

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


    // Страницу площадки видят и гости, у которых избранного нет:
    // сервер отдаёт его только вошедшему (GET /favorites), так что
    // гостю не загружаем (иначе пустая 401-ошибка в консоли), а
    // попытка добавить в избранное ведёт на вход.
    const {
        user,
    } = useAuth();

    const goToLogin = useLoginRedirect();

    // Счётчик "подписчиков" площадки считает сервер (favoritesCount),
    // поэтому после каждого добавления/удаления перечитываем площадку —
    // иначе число на странице обновилось бы только после перезагрузки.
    const {
        refreshPlayground,
    } = usePlaygrounds();

    const currentUserId =
        user?.id;


    useEffect(() => {
        if (currentUserId === undefined) {
            return;
        }

        listFavorites()
            .then(setFavorites)
            .catch((error: unknown) => {
                console.error(
                    "Не удалось загрузить избранное:",
                    error
                );
            });
    }, [currentUserId]);


    async function addFavorite(
        playgroundId: string
    ) {
        if (currentUserId === undefined) {
            goToLogin();

            return;
        }

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

        await refreshPlayground(playgroundId);
    }



    async function removeFavorite(
        playgroundId: string
    ) {
        if (currentUserId === undefined) {
            return;
        }

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

        await refreshPlayground(playgroundId);
    }



    async function toggleFavorite(
        playgroundId: string
    ) {
        if (currentUserId === undefined) {
            goToLogin();

            return;
        }

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
        if (currentUserId === undefined) {
            return false;
        }

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
