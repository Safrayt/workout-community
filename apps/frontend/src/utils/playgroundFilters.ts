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

/**
 * Общее количество выбранных пунктов фильтра (по всем группам) — для
 * индикатора "Фильтры · 3" на кнопке-тоггле (раздел 16 UX-спеки).
 */
export function countActivePlaygroundFilters(
    filters: PlaygroundFilterState
) {
    return (
        filters.sizes.length +
        filters.surfaces.length +
        filters.equipment.length +
        filters.amenities.length
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

    // Внутри группы фильтры комбинируются через ИЛИ: площадка проходит,
    // если у неё есть хотя бы один из выбранных пунктов группы. Между
    // группами (size / surface / equipment / amenities) — через И.
    // См. UX-спеку "Страница «Площадки»", раздел 14.
    if (
        filters.equipment.length > 0 &&
        !filters.equipment.some(
            (item) => playground.equipment.includes(item)
        )
    ) {
        return false;
    }

    if (
        filters.amenities.length > 0 &&
        !filters.amenities.some(
            (key) => playground.amenities[key]
        )
    ) {
        return false;
    }

    return true;
}