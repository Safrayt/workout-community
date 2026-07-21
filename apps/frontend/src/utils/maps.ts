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