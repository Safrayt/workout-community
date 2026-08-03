import type {
    PlaygroundSize,
    PlaygroundSurface,
    PlaygroundEquipment,
    PlaygroundAmenities,
} from "./playground";

export type PlaygroundFilterState = {

    sizes: PlaygroundSize[];

    surfaces: PlaygroundSurface[];

    equipment: PlaygroundEquipment[];

    amenities: (keyof PlaygroundAmenities)[];

};

export const emptyPlaygroundFilters: PlaygroundFilterState = {
    sizes: [],
    surfaces: [],
    equipment: [],
    amenities: [],
};