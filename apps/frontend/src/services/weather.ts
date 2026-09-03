import { apiFetch, buildQuery } from "../api/client";
import { ApiError } from "../api/errors";

export type HourlyForecast = {
    temperature: number;

    weatherCode: number;

    precipitationProbability: number;

    windSpeed: number;

    /** Локальное время, для которого реально нашёлся прогноз ("2026-08-18T10:00"). */
    matchedTime: string;

    /** false, если под точный час события данных не было и взят ближайший. */
    isExactHour: boolean;
};

export type DailyForecast = {
    weatherCode: number;

    temperatureMax: number;

    temperatureMin: number;
};

/**
 * Раньше оба метода ниже стучались напрямую в api.open-meteo.com из
 * браузера. Теперь запрос идёт через наш бэкенд (app/routers/external.py),
 * который кэширует ответ и переиспользует его для всех пользователей,
 * смотрящих одно и то же событие/площадку — см. аудит "сырых мест",
 * пункт про geocoding/weather.
 *
 * Бэкенд отвечает 404, когда прогноза для этих параметров нет (например,
 * дата вне 15-дневного окна) — это единственный статус, который мы здесь
 * превращаем в null, сохраняя прежний контракт функции. Любая другая
 * ошибка (502, сеть) продолжает падать наружу, как и раньше — вызывающий
 * код (см. hooks/useEventWeather.ts, useEventHourlyWeather.ts) уже умеет
 * ловить её через .catch() и показывать status: "error".
 */

/**
 * Прогноз на конкретный час, максимально близкий ко времени события
 * (а не просто на весь день, как getDailyForecast). Нужен для
 * блока погоды на странице события, где важно показать условия
 * именно к моменту начала тренировки.
 */
export async function getHourlyForecast(
    latitude: number,
    longitude: number,
    startDateIso: string
): Promise<HourlyForecast | null> {
    try {
        return await apiFetch<HourlyForecast>(
            `/external/weather/hourly${buildQuery({
                latitude,
                longitude,
                start: startDateIso,
            })}`
        );
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }

        throw error;
    }
}

export async function getDailyForecast(
    latitude: number,
    longitude: number,
    dateString: string
): Promise<DailyForecast | null> {
    try {
        return await apiFetch<DailyForecast>(
            `/external/weather/daily${buildQuery({
                latitude,
                longitude,
                date: dateString,
            })}`
        );
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }

        throw error;
    }
}
