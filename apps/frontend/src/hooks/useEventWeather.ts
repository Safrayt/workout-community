import {
    useEffect,
    useState,
} from "react";

import {
    getDailyForecast,
} from "../services/weather";

import type {
    DailyForecast,
} from "../services/weather";

// MET Norway даёт прогноз примерно на 9–10 суток вперёд. Берём 9 с запасом:
// для более поздних дат прогноза ещё нет, и честнее сказать об этом сразу,
// чем отправлять запрос, который закончится пустым ответом.
const MAX_FORECAST_DAYS = 9;

export type EventWeatherState =
    | { status: "loading" }
    | { status: "past" }
    | { status: "too-far" }
    | { status: "error" }
    | { status: "ready"; forecast: DailyForecast };

function getDaysFromToday(
    dateString: string
) {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const target = new Date(dateString);

    target.setHours(0, 0, 0, 0);

    const diffMs =
        target.getTime() - today.getTime();

    return Math.round(
        diffMs / (1000 * 60 * 60 * 24)
    );
}

function getWindowStatus(
    startDate: string,
    latitude?: number,
    longitude?: number
): "past" | "too-far" | "missing-location" | "in-window" {

    if (
        latitude === undefined ||
        longitude === undefined
    ) {
        return "missing-location";
    }

    const daysFromToday =
        getDaysFromToday(startDate);

    if (daysFromToday < 0) {
        return "past";
    }

    if (daysFromToday > MAX_FORECAST_DAYS) {
        return "too-far";
    }

    return "in-window";
}

export function useEventWeather(
    startDate: string,
    latitude?: number,
    longitude?: number
): EventWeatherState {

    const windowStatus = getWindowStatus(
        startDate,
        latitude,
        longitude
    );

    const requestKey =
        `${windowStatus}|${startDate}|${latitude}|${longitude}`;

    const [
        fetchResult,
        setFetchResult,
    ] = useState<{ key: string; state: EventWeatherState }>(() => ({
        key: requestKey,
        state: { status: "loading" },
    }));

    // Reset to "loading" as soon as the request parameters change, without
    // waiting for the effect below to run.
    const fetchState =
        fetchResult.key === requestKey
            ? fetchResult.state
            : { status: "loading" as const };

    useEffect(() => {

        if (windowStatus !== "in-window") {
            return;
        }

        let cancelled = false;

        const dateString =
            startDate.slice(0, 10);

        getDailyForecast(
            latitude as number,
            longitude as number,
            dateString
        )
            .then((forecast) => {
                if (cancelled) {
                    return;
                }

                setFetchResult({
                    key: requestKey,
                    // null — сервер ответил 404: на эту дату прогноза
                    // ещё нет (это не ошибка, а "пока недоступен").
                    state: forecast
                        ? { status: "ready", forecast }
                        : { status: "too-far" },
                });
            })
            .catch(() => {
                if (!cancelled) {
                    setFetchResult({
                        key: requestKey,
                        state: { status: "error" },
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [requestKey, windowStatus, startDate, latitude, longitude]);

    if (windowStatus === "past") {
        return { status: "past" };
    }

    if (windowStatus === "too-far") {
        return { status: "too-far" };
    }

    if (windowStatus === "missing-location") {
        return { status: "error" };
    }

    return fetchState;
}