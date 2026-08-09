import type { PlaygroundFavorite } from "../types/favorite";
import type { Playground } from "../types/playground";

export function isPlaygroundFavorited(
    favorites: PlaygroundFavorite[],
    userId: string,
    playgroundId: string
) {
    return favorites.some(
        (favorite) =>
            favorite.userId === userId &&
            favorite.playgroundId === playgroundId
    );
}

export function getFavoritePlaygrounds(
    playgrounds: Playground[],
    favorites: PlaygroundFavorite[],
    userId: string
) {
    const favoritePlaygroundIds = new Set(
        favorites
            .filter(
                (favorite) => favorite.userId === userId
            )
            .map(
                (favorite) => favorite.playgroundId
            )
    );

    return playgrounds.filter(
        (playground) =>
            favoritePlaygroundIds.has(playground.id)
    );
}
