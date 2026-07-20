export type PlaygroundSize =
    | "small"
    | "medium"
    | "large";

export type PlaygroundSurface =
    | "rubber"
    | "asphalt"
    | "gravel"
    | "mulch"
    | "sand"
    | "ground";

export type PlaygroundEquipment =
    | "widePullBar"
    | "highPullBar"
    | "mediumPullBar"
    | "lowPullBar"
    | "middlePushBar"
    | "lowPushBar"
    | "labyrinth"
    | "highParallelBars"
    | "mediumParallelBars"
    | "parallettes"
    | "pushUpBars"
    | "wideMonkeyBars"
    | "narrowMonkeyBars"
    | "swedishWall"
    | "inclineBench"
    | "posts"
    | "rings"
    | "rope";

export type PlaygroundCoordinates = {
    latitude: number;
    longitude: number;
};

export type PlaygroundAmenities = {
    lighting: boolean;

    covered: boolean;

    changingRoom: boolean;

    toilet: boolean;

    drinkingWater: boolean;

    shower: boolean;

    parking: boolean;

    bicycleParking: boolean;
};

export type PlaygroundPhoto = {
    id: string;
    url: string;
    description?: string;
};

export type Playground = {

    id: string;

    name: string;

    locality: string;

    address: string;

    coordinates: PlaygroundCoordinates;

    size: PlaygroundSize;

    amenities: PlaygroundAmenities;

    surface: PlaygroundSurface;

    equipment: PlaygroundEquipment[];

    photos: PlaygroundPhoto[]

    openingHours: string;

    description: string;
};