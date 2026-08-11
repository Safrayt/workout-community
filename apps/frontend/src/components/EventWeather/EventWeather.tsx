import "../../styles/components/event-weather.css";

import {
    useEventHourlyWeather,
} from "../../hooks/useEventHourlyWeather";

import {
    getWeatherCodeInfo,
} from "../../utils/weatherCode";

import {
    formatEventTime,
} from "../../utils/formatEventDate";

import type {
    PlaygroundCoordinates,
} from "../../types/playground";

type Props = {

    startDate: string;

    coordinates?: PlaygroundCoordinates;

};

/**
 * Блок погоды на странице события (UX-спецификация, §14–17).
 *
 * В отличие от однострочной сводки в карточке события
 * (см. EventCard, formatEventWeather), здесь погода подобрана под
 * конкретный час начала тренировки, а не просто на весь день, и
 * дополнена вероятностью осадков и скоростью ветра.
 */
export default function EventWeather({
    startDate,
    coordinates,
}: Props) {

    const state = useEventHourlyWeather(
        startDate,
        coordinates?.latitude,
        coordinates?.longitude
    );

    // Для прошедших событий блок погоды не показываем — архивного
    // прогноза у нас нет, а гадать задним числом не имеет смысла.
    if (state.status === "past") {
        return null;
    }

    if (state.status === "loading") {
        return (
            <section className="event-weather event-weather--placeholder">
                <h2 className="event-weather__title">Погода</h2>
                <p className="event-weather__message">Загрузка прогноза…</p>
            </section>
        );
    }

    if (state.status === "too-far") {
        return (
            <section className="event-weather event-weather--placeholder">
                <h2 className="event-weather__title">Погода</h2>
                <p className="event-weather__message">
                    Прогноз погоды пока недоступен.
                </p>
            </section>
        );
    }

    if (state.status === "error") {
        return (
            <section className="event-weather event-weather--placeholder">
                <h2 className="event-weather__title">Погода</h2>
                <p className="event-weather__message">
                    Не удалось получить прогноз погоды.
                </p>
            </section>
        );
    }

    const { forecast } = state;

    const { description, icon } =
        getWeatherCodeInfo(forecast.weatherCode);

    const temperature =
        Math.round(forecast.temperature);

    return (

        <section className="event-weather">

            <div className="event-weather__heading">
                <h2 className="event-weather__title">Погода</h2>
                <span className="event-weather__disclaimer">
                    Ориентировочный прогноз
                </span>
            </div>

            <div className="event-weather__main">
                <span className="event-weather__icon" aria-hidden="true">
                    {icon}
                </span>

                <span className="event-weather__temperature">
                    {`${temperature}°C`}
                </span>

                <span className="event-weather__description">
                    {description}
                </span>
            </div>

            <div className="event-weather__details">
                <span className="event-weather__detail">
                    {`Осадки: ${Math.round(forecast.precipitationProbability)}%`}
                </span>

                <span className="event-weather__detail">
                    {`Ветер: ${Math.round(forecast.windSpeed)} км/ч`}
                </span>
            </div>

            {
                !forecast.isExactHour && (
                    <p className="event-weather__note">
                        {`Точных данных на время начала нет, показан ближайший доступный час — ${formatEventTime(forecast.matchedTime)}.`}
                    </p>
                )
            }

        </section>

    );
}
