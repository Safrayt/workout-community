import type {
    Playground,
    PlaygroundAccess,
    PlaygroundCondition,
    PlaygroundEquipment,
    PlaygroundHistoryEntry,
    PlaygroundHistoryEntryType,
    PlaygroundPhoto,
    PlaygroundSize,
    PlaygroundSurface,
} from "../../types/playground";
import type { NewPlayground } from "../../types/newPlayground";

import { resolveMediaUrl } from "../media";

export type ApiPlaygroundPhoto = {
    id: number;
    url: string;
    description: string | null;
    is_main: boolean;
};

export type ApiPlaygroundHistoryEntry = {
    id: number;
    type: PlaygroundHistoryEntryType;
    date: string;
    user_id: number;
    username: string;
    changed_fields: string[] | null;
};

export type ApiPlayground = {
    id: number;
    creator_id: number;
    name: string;
    locality: string;
    address: string;
    latitude: number;
    longitude: number;
    size: PlaygroundSize;
    surface: PlaygroundSurface;
    access: PlaygroundAccess;
    access_restrictions: string | null;
    condition: PlaygroundCondition;
    opening_hours: string;
    description: string;
    lighting: boolean;
    covered: boolean;
    changing_room: boolean;
    toilet: boolean;
    drinking_water: boolean;
    shower: boolean;
    parking: boolean;
    bicycle_parking: boolean;
    trash_bins: boolean;
    shade: boolean;
    equipment: PlaygroundEquipment[];
    created_at: string;
    updated_at: string;
    photos: ApiPlaygroundPhoto[];
    history: ApiPlaygroundHistoryEntry[];
};

function mapApiPhoto(photo: ApiPlaygroundPhoto): PlaygroundPhoto {
    return {
        id: String(photo.id),
        url: resolveMediaUrl(photo.url)!,
        description: photo.description ?? undefined,
        isMain: photo.is_main,
    };
}

function mapApiHistoryEntry(
    entry: ApiPlaygroundHistoryEntry
): PlaygroundHistoryEntry {
    return {
        id: String(entry.id),
        type: entry.type,
        date: entry.date,
        userId: String(entry.user_id),
        username: entry.username,
        changedFields: entry.changed_fields ?? undefined,
    };
}

export function mapApiPlaygroundToPlayground(
    apiPlayground: ApiPlayground
): Playground {
    return {
        id: String(apiPlayground.id),
        creatorId: String(apiPlayground.creator_id),
        name: apiPlayground.name,
        locality: apiPlayground.locality,
        address: apiPlayground.address,
        coordinates: {
            latitude: apiPlayground.latitude,
            longitude: apiPlayground.longitude,
        },
        size: apiPlayground.size,
        surface: apiPlayground.surface,
        access: apiPlayground.access,
        accessRestrictions:
            apiPlayground.access_restrictions ?? undefined,
        condition: apiPlayground.condition,
        amenities: {
            lighting: apiPlayground.lighting,
            covered: apiPlayground.covered,
            changingRoom: apiPlayground.changing_room,
            toilet: apiPlayground.toilet,
            drinkingWater: apiPlayground.drinking_water,
            shower: apiPlayground.shower,
            parking: apiPlayground.parking,
            bicycleParking: apiPlayground.bicycle_parking,
            trashBins: apiPlayground.trash_bins,
            shade: apiPlayground.shade,
        },
        equipment: apiPlayground.equipment,
        photos: apiPlayground.photos.map(mapApiPhoto),
        openingHours: apiPlayground.opening_hours,
        description: apiPlayground.description,
        createdAt: apiPlayground.created_at,
        updatedAt: apiPlayground.updated_at,
        history: apiPlayground.history.map(mapApiHistoryEntry),
    };
}

/**
 * NewPlayground -> тело запроса для POST/PUT /playgrounds. Фото сюда
 * намеренно не входят — они летят отдельными запросами на
 * /playgrounds/{id}/photos уже после создания/обновления самой
 * площадки (см. api/playgrounds.ts createPlayground/updatePlayground).
 */
export function mapNewPlaygroundToApi(
    playground: NewPlayground
): Record<string, unknown> {
    return {
        name: playground.name,
        locality: playground.locality,
        address: playground.address,
        latitude: playground.coordinates?.latitude ?? 0,
        longitude: playground.coordinates?.longitude ?? 0,
        size: playground.size || "medium",
        surface: playground.surface || "ground",
        access: playground.access || "free",
        access_restrictions:
            playground.access === "limited"
                ? playground.accessRestrictions
                : null,
        condition: playground.condition || "acceptable",
        opening_hours:
            playground.openingHours.trim().length > 0
                ? playground.openingHours
                : "Не указано",
        description: playground.description,
        lighting: playground.amenities.lighting,
        covered: playground.amenities.covered,
        changing_room: playground.amenities.changingRoom,
        toilet: playground.amenities.toilet,
        drinking_water: playground.amenities.drinkingWater,
        shower: playground.amenities.shower,
        parking: playground.amenities.parking,
        bicycle_parking: playground.amenities.bicycleParking,
        trash_bins: playground.amenities.trashBins,
        shade: playground.amenities.shade,
        equipment: playground.equipment,
    };
}
