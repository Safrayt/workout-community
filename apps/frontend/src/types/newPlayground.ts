import type {
    PlaygroundAccess,
    PlaygroundAmenities,
    PlaygroundCondition,
    PlaygroundCoordinates,
    PlaygroundEquipment,
    PlaygroundSize,
    PlaygroundSurface,
} from "./playground";

export type NewPlaygroundPhoto = {
    id: string;

    url: string;

    isMain: boolean;
};

export type NewPlayground = {
    name: string;

    locality: string;

    address: string;

    coordinates: PlaygroundCoordinates | null;

    size: PlaygroundSize | "";

    surface: PlaygroundSurface | "";

    access: PlaygroundAccess | "";

    accessRestrictions: string;

    condition: PlaygroundCondition | "";

    amenities: PlaygroundAmenities;

    equipment: PlaygroundEquipment[];

    photos: NewPlaygroundPhoto[];

    openingHours: string;

    description: string;
};