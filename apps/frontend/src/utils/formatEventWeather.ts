import {
    getWeatherCodeInfo,
} from "./weatherCode";

import type {
    EventWeatherState,
} from "../hooks/useEventWeather";

export function formatEventWeather(
    state: EventWeatherState
): string {
    switch (state.status) {
        case "loading":
            return "Загрузка…";

        case "past":
            return "Мероприятие уже прошло";

        case "too-far":
            return "Прогноз появится ближе к дате мероприятия";

        case "error":
            return "Не удалось загрузить прогноз";

        case "ready": {
            const { description, icon } =
                getWeatherCodeInfo(
                    state.forecast.weatherCode
                );

            const max =
                Math.round(state.forecast.temperatureMax);

            const min =
                Math.round(state.forecast.temperatureMin);

            return `${icon} ${description}, ${min}…${max}°C`;
        }
    }
}