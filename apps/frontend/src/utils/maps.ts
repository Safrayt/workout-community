import type { Playground } from "../types/playground";
import type { MapMarker } from "../types/map";


export function getCoordinatesString(
    latitude: number,
    longitude: number
) {
    return `${latitude},${longitude}`;
}

export function getYandexMapsUrl(
    latitude: number,
    longitude: number
) {
    return `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=16`;
}

export function getPlaygroundMarkers(
    playgrounds: Playground[]
): MapMarker[] {
    return playgrounds.map(
        (playground) => ({
            id: playground.id,

            title: playground.name,

            latitude:
                playground.coordinates.latitude,

            longitude:
                playground.coordinates.longitude,
            
            url: `/playgrounds/${playground.id}`,

            photoUrl:
                playground.photos.find(
                    (photo) => photo.isMain
                )?.url ??
                playground.photos[0]?.url,
        })
    );
}