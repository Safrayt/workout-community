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

/**
 * Последние добавленные в избранное площадки пользователя — от самой
 * свежей к более ранним, не больше limit штук. Связи избранного, у
 * которых площадка уже не существует (удалена), пропускаются, а
 * лимит считается по оставшимся: пользователь всегда видит limit
 * реальных площадок, если они у него есть.
 */
export function getRecentFavoritePlaygrounds(
    playgrounds: Playground[],
    favorites: PlaygroundFavorite[],
    userId: string,
    limit: number
) {
    const playgroundsById = new Map(
        playgrounds.map((playground) => [playground.id, playground])
    );

    return favorites
        .filter((favorite) => favorite.userId === userId)
        .sort((a, b) => {
            const diff = Date.parse(b.createdAt) - Date.parse(a.createdAt);

            // Одинаковое время (или нераспознанная дата) — по id, у
            // более поздней связи id больше.
            return Number.isNaN(diff) || diff === 0
                ? b.id.localeCompare(a.id, undefined, { numeric: true })
                : diff;
        })
        .map((favorite) => playgroundsById.get(favorite.playgroundId))
        .filter(
            (playground): playground is Playground =>
                playground !== undefined
        )
        .slice(0, limit);
}
