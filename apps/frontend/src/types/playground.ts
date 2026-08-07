export type PlaygroundSize =
    | "small"
    | "medium"
    | "large";

export type PlaygroundSurface =
    | "rubber"
    | "asphalt"
    | "concrete"
    | "gravel"
    | "mulch"
    | "sand"
    | "ground"
    | "mixed";

export type PlaygroundAccess =
    | "free"
    | "limited";

export type PlaygroundCondition =
    | "acceptable"
    | "needsRepair"
    | "unusable";

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
    | "Bench"
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

    trashBins: boolean;

    shade: boolean;
};

export type PlaygroundHistoryEntryType =
    | "created"
    | "inspection"
    | "edit";

export type PlaygroundHistoryEntry = {
    id: string;

    type: PlaygroundHistoryEntryType;

    date: string;

    userId: string;

    username: string;

    /** Только для type === "edit": какие поля были изменены. */
    changedFields?: string[];
};

export type PlaygroundPhoto = {
    id: string;
    url: string;
    description?: string;
    isMain?: boolean;
};

export type Playground = {

    id: string;

    creatorId: string;

    name: string;

    locality: string;

    address: string;

    coordinates: PlaygroundCoordinates;

    size: PlaygroundSize;

    amenities: PlaygroundAmenities;

    surface: PlaygroundSurface;

    access: PlaygroundAccess;

    accessRestrictions?: string;

    condition: PlaygroundCondition;

    equipment: PlaygroundEquipment[];

    photos: PlaygroundPhoto[]

    openingHours: string;

    description: string;

    createdAt: string;

    updatedAt: string;

    history: PlaygroundHistoryEntry[];
};