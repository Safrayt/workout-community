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

    const dateString =
        startDateIso.slice(0, 10);

    const targetHourKey =
        startDateIso.slice(0, 13); // "2026-08-18T10"

    const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&hourly=temperature_2m,weathercode,precipitation_probability,windspeed_10m` +
        `&timezone=auto` +
        `&start_date=${dateString}` +
        `&end_date=${dateString}`;

    const response =
        await fetch(url);

    if (!response.ok) {
        throw new Error(
            "Unable to load weather forecast."
        );
    }

    const data =
        await response.json();

    const times: string[] | undefined =
        data?.hourly?.time;

    const temperatures: number[] | undefined =
        data?.hourly?.temperature_2m;

    const weatherCodes: number[] | undefined =
        data?.hourly?.weathercode;

    const precipitationProbabilities: number[] | undefined =
        data?.hourly?.precipitation_probability;

    const windSpeeds: number[] | undefined =
        data?.hourly?.windspeed_10m;

    if (
        !times ||
        !temperatures ||
        !weatherCodes ||
        !precipitationProbabilities ||
        !windSpeeds ||
        times.length === 0
    ) {
        return null;
    }

    let bestIndex = 0;
    let isExactHour = false;

    for (let i = 0; i < times.length; i++) {
        if (times[i].slice(0, 13) === targetHourKey) {
            bestIndex = i;
            isExactHour = true;
            break;
        }
    }

    if (!isExactHour) {
        // Ближайший доступный час по времени (§17: если точного часа нет,
        // берём ближайший и явно помечаем это в интерфейсе).
        const targetTime =
            new Date(startDateIso).getTime();

        let minDiff = Infinity;

        times.forEach((time, index) => {
            const diff = Math.abs(
                new Date(time).getTime() - targetTime
            );

            if (diff < minDiff) {
                minDiff = diff;
                bestIndex = index;
            }
        });
    }

    if (
        temperatures[bestIndex] === undefined ||
        weatherCodes[bestIndex] === undefined
    ) {
        return null;
    }

    return {
        temperature: temperatures[bestIndex],
        weatherCode: weatherCodes[bestIndex],
        precipitationProbability:
            precipitationProbabilities[bestIndex] ?? 0,
        windSpeed: windSpeeds[bestIndex] ?? 0,
        matchedTime: times[bestIndex],
        isExactHour,
    };
}

export type DailyForecast = {
    weatherCode: number;

    temperatureMax: number;

    temperatureMin: number;
};

export async function getDailyForecast(
    latitude: number,
    longitude: number,
    dateString: string
): Promise<DailyForecast | null> {

    const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
        `&timezone=auto` +
        `&start_date=${dateString}` +
        `&end_date=${dateString}`;

    const response =
        await fetch(url);

    if (!response.ok) {
        throw new Error(
            "Unable to load weather forecast."
        );
    }

    const data =
        await response.json();

    const weatherCode =
        data?.daily?.weathercode?.[0];

    const temperatureMax =
        data?.daily?.temperature_2m_max?.[0];

    const temperatureMin =
        data?.daily?.temperature_2m_min?.[0];

    if (
        weatherCode === undefined ||
        temperatureMax === undefined ||
        temperatureMin === undefined
    ) {
        return null;
    }

    return {
        weatherCode,
        temperatureMax,
        temperatureMin,
    };
}