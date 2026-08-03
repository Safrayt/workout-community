import type { Playground } from "../types/playground";
import type { PlaygroundFilterState } from "../types/playgroundFilters";

export function filterPlaygrounds(
    playgrounds: Playground[],
    filters: PlaygroundFilterState
) {
    return playgrounds.filter(
        (playground) =>
            matchesFilters(playground, filters)
    );
}

export function hasActivePlaygroundFilters(
    filters: PlaygroundFilterState
) {
    return (
        filters.sizes.length > 0 ||
        filters.surfaces.length > 0 ||
        filters.equipment.length > 0 ||
        filters.amenities.length > 0
    );
}

function matchesFilters(
    playground: Playground,
    filters: PlaygroundFilterState
) {
    if (
        filters.sizes.length > 0 &&
        !filters.sizes.includes(playground.size)
    ) {
        return false;
    }

    if (
        filters.surfaces.length > 0 &&
        !filters.surfaces.includes(playground.surface)
    ) {
        return false;
    }

    if (
        filters.equipment.length > 0 &&
        !filters.equipment.every(
            (item) => playground.equipment.includes(item)
        )
    ) {
        return false;
    }

    if (
        filters.amenities.length > 0 &&
        !filters.amenities.every(
            (key) => playground.amenities[key]
        )
    ) {
        return false;
    }

    return true;
}