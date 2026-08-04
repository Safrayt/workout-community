import type { Playground } from "../types/playground";
import type { NewPlayground } from "../types/newPlayground";

export function playgroundToFormValue(
    playground: Playground
): NewPlayground {
    return {
        name: playground.name,

        locality: playground.locality,

        address: playground.address,

        coordinates: playground.coordinates,

        size: playground.size,

        surface: playground.surface,

        amenities: playground.amenities,

        equipment: playground.equipment,

        photos: playground.photos.map((photo) => ({
            id: photo.id,
            url: photo.url,
            isMain: photo.isMain ?? false,
        })),

        openingHours: playground.openingHours,

        description: playground.description,
    };
}