export type WeatherCodeInfo = {
    description: string;

    icon: string;
};

const WEATHER_CODES: Record<number, WeatherCodeInfo> = {
    0: { description: "Ясно", icon: "☀️" },
    1: { description: "Преимущественно ясно", icon: "🌤️" },
    2: { description: "Переменная облачность", icon: "⛅" },
    3: { description: "Пасмурно", icon: "☁️" },
    45: { description: "Туман", icon: "🌫️" },
    48: { description: "Изморозь", icon: "🌫️" },
    51: { description: "Лёгкая морось", icon: "🌦️" },
    53: { description: "Морось", icon: "🌦️" },
    55: { description: "Сильная морось", icon: "🌦️" },
    56: { description: "Ледяная морось", icon: "🌦️" },
    57: { description: "Сильная ледяная морось", icon: "🌦️" },
    61: { description: "Небольшой дождь", icon: "🌧️" },
    63: { description: "Дождь", icon: "🌧️" },
    65: { description: "Сильный дождь", icon: "🌧️" },
    66: { description: "Ледяной дождь", icon: "🌧️" },
    67: { description: "Сильный ледяной дождь", icon: "🌧️" },
    71: { description: "Небольшой снег", icon: "🌨️" },
    73: { description: "Снег", icon: "🌨️" },
    75: { description: "Сильный снег", icon: "🌨️" },
    77: { description: "Снежная крупа", icon: "🌨️" },
    80: { description: "Небольшие ливни", icon: "🌦️" },
    81: { description: "Ливни", icon: "🌦️" },
    82: { description: "Сильные ливни", icon: "🌦️" },
    85: { description: "Небольшой снегопад", icon: "🌨️" },
    86: { description: "Сильный снегопад", icon: "🌨️" },
    95: { description: "Гроза", icon: "⛈️" },
    96: { description: "Гроза с градом", icon: "⛈️" },
    99: { description: "Сильная гроза с градом", icon: "⛈️" },
};

export function getWeatherCodeInfo(
    code: number
): WeatherCodeInfo {
    return (
        WEATHER_CODES[code] ?? {
            description: "Неизвестно",
            icon: "🌡️",
        }
    );
}