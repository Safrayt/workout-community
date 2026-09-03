import { apiFetch, buildQuery } from "../api/client";

export type ReverseGeocodeResult = {
    locality: string;

    address: string;
};

/**
 * Раньше стучался напрямую в nominatim.openstreetmap.org из браузера.
 * Теперь идёт через наш бэкенд (app/routers/external.py), который
 * добавляет корректный User-Agent (Nominatim требует его по своей
 * usage policy) и кэширует результат на 7 дней по координатам — адрес
 * по ним практически никогда не меняется. См. аудит "сырых мест".
 */
export async function reverseGeocode(
    latitude: number,
    longitude: number
): Promise<ReverseGeocodeResult> {
    return apiFetch<ReverseGeocodeResult>(
        `/external/geocode/reverse${buildQuery({ latitude, longitude })}`
    );
}
