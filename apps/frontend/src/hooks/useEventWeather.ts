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

// Open-Meteo predicts up to 16 days ahead (today + 15 full days).
const MAX_FORECAST_DAYS = 15;

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