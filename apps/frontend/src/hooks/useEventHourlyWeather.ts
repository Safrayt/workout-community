import {
    useEffect,
    useState,
} from "react";

import {
    getHourlyForecast,
} from "../services/weather";

import type {
    HourlyForecast,
} from "../services/weather";

// Open-Meteo predicts up to 16 days ahead (today + 15 full days).
const MAX_FORECAST_DAYS = 15;

export type EventHourlyWeatherState =
    | { status: "loading" }
    | { status: "past" }
    | { status: "too-far" }
    | { status: "error" }
    | { status: "ready"; forecast: HourlyForecast };

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

export function useEventHourlyWeather(
    startDate: string,
    latitude?: number,
    longitude?: number
): EventHourlyWeatherState {

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
    ] = useState<{ key: string; state: EventHourlyWeatherState }>(() => ({
        key: requestKey,
        state: { status: "loading" },
    }));

    const fetchState =
        fetchResult.key === requestKey
            ? fetchResult.state
            : { status: "loading" as const };

    useEffect(() => {

        if (windowStatus !== "in-window") {
            return;
        }

        let cancelled = false;

        getHourlyForecast(
            latitude as number,
            longitude as number,
            startDate
        )
            .then((forecast) => {
                if (cancelled) {
                    return;
                }

                setFetchResult({
                    key: requestKey,
                    state: forecast
                        ? { status: "ready", forecast }
                        : { status: "error" },
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
