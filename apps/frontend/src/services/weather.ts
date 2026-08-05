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