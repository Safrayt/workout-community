"""
Разбор прогноза погоды MET Norway (Locationforecast 2.0, api.met.no).

Раньше прогноз брался у Open-Meteo, но сервер расположен в РФ, а
api.open-meteo.com оттуда недоступен. MET Norway открывается без
VPN, бесплатен и не требует ключа (нужен только осмысленный
User-Agent с контактом — он выставляется в app/routers/external.py).

Здесь только чистая логика без сети и без FastAPI — её можно
проверять тестами (tests/test_met_weather.py) без запуска сервера:

1. MET отдаёт время в UTC, а время события — "настенное", местное для
   площадки (см. app/utc.py, WallClockDatetime). Поэтому время каждой
   точки прогноза переводится в пояс площадки, который определяется
   по координатам.
2. Фронтенд (utils/weatherCode.ts) знает коды погоды WMO, а MET
   отдаёт текстовые обозначения вроде "partlycloudy_day" — они
   переводятся в коды WMO.
3. Ответ MET — не "один час на события", а ряд точек: первые трое
   суток почасовые, дальше с шагом в 6 часов. Из ряда выбирается
   точка, ближайшая к началу события.

Данные MET Norway распространяются под лицензиями NLOD 2.0 и
CC BY 4.0: на странице события стоит ссылка на источник.
"""

import logging
import re
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone, tzinfo
from functools import lru_cache
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger(__name__)

# Периоды, на которые MET даёт сводку, от самого точного к самому
# грубому: у ближних точек есть все три, у дальних — только 6 и 12 часов.
_PERIOD_KEYS = ("next_1_hours", "next_6_hours", "next_12_hours")

# Если ближайшая точка прогноза дальше этого от начала события
# (событие за пределами прогноза), считаем, что прогноза нет.
_MAX_GAP_AFTER_FORECAST = timedelta(hours=6)

# Событие в пределах получаса от точки прогноза считаем попавшим
# "в точку", дальше — показываем пометку про ближайший час.
_EXACT_MATCH_TOLERANCE = timedelta(minutes=30)

# Часы, по которым выбирается "погода дня" для карточки события:
# ночь на решение пойти на тренировку не влияет.
_DAYTIME_HOURS = range(8, 21)

# Доля дневных точек с осадками, начиная с которой погода дня
# показывается как дождливая/снежная (а не как преобладающая облачность).
_PRECIPITATION_SHARE = 1 / 3

_DAY_PART_SUFFIX = re.compile(r"_(day|night|polartwilight)$")


# --- Коды погоды ------------------------------------------------------------

# Обозначения MET без суффикса "_day"/"_night" -> код WMO, который
# понимает фронтенд. У MET нет отдельных кодов для мороси и града, а
# "sleet" (дождь со снегом) ближе всего к ледяному дождю WMO.
_SYMBOL_TO_WMO = {
    "clearsky": 0,
    "fair": 1,
    "partlycloudy": 2,
    "cloudy": 3,
    "fog": 45,
    "lightrain": 61,
    "rain": 63,
    "heavyrain": 65,
    "lightrainshowers": 80,
    "rainshowers": 81,
    "heavyrainshowers": 82,
    "lightsleet": 66,
    "sleet": 67,
    "heavysleet": 67,
    "lightsleetshowers": 66,
    "sleetshowers": 67,
    "heavysleetshowers": 67,
    "lightsnow": 71,
    "snow": 73,
    "heavysnow": 75,
    "lightsnowshowers": 85,
    "snowshowers": 85,
    "heavysnowshowers": 86,
}


def symbol_to_wmo(symbol_code: str) -> Optional[int]:
    """
    Переводит обозначение погоды MET в код WMO или возвращает None,
    если обозначение незнакомое (лучше показать "неизвестно", чем
    выдумать погоду).

    Грозовые варианты ("rainandthunder", "heavyrainshowersandthunder"
    и т.п.) все сводятся к грозе: 95 — обычная, 99 — сильная.
    """
    name = _DAY_PART_SUFFIX.sub("", symbol_code.strip().lower())

    if "thunder" in name:
        return 99 if "heavy" in name else 95

    return _SYMBOL_TO_WMO.get(name)


# --- Часовой пояс площадки --------------------------------------------------

_finder = None
_finder_unavailable = False


def _lookup_zone_name(latitude: float, longitude: float) -> Optional[str]:
    """
    Название пояса ("Europe/Moscow") по координатам — через пакет
    timezonefinder, он работает без сети. Если пакета нет или он
    сломался, возвращает None, а вызывающий код берёт приближение
    по долготе: прогноз всё равно покажется, пусть и со сдвигом в час
    в пограничных случаях.
    """
    global _finder, _finder_unavailable

    if _finder_unavailable:
        return None

    try:
        if _finder is None:
            from timezonefinder import TimezoneFinder

            _finder = TimezoneFinder()

        return _finder.timezone_at(lat=latitude, lng=longitude)
    except Exception:  # noqa: BLE001 — любая поломка пакета не должна ронять погоду
        _finder_unavailable = True

        logger.warning(
            "Не удалось определить часовой пояс по координатам через "
            "timezonefinder — используется приближение по долготе.",
            exc_info=True,
        )

        return None


def resolve_timezone(zone_name: Optional[str], longitude: float) -> tzinfo:
    """
    Пояс по названию, а если названия нет или оно незнакомо системе —
    приближение по долготе (по 15° на час, без учёта летнего времени).
    """
    if zone_name:
        try:
            return ZoneInfo(zone_name)
        except (ZoneInfoNotFoundError, ValueError):
            logger.warning("Незнакомый часовой пояс: %s", zone_name)

    return timezone(timedelta(hours=round(longitude / 15)))


@lru_cache(maxsize=2048)
def timezone_for(latitude: float, longitude: float) -> tzinfo:
    """Часовой пояс площадки. Результат кэшируется: у площадки он не меняется."""
    return resolve_timezone(_lookup_zone_name(latitude, longitude), longitude)


# --- Разбор ответа MET ------------------------------------------------------


@dataclass(frozen=True)
class ForecastPoint:
    """Одна точка прогноза. Время — местное, без пояса (как у события)."""

    local_time: datetime
    temperature: float
    wind_speed_kmh: float
    weather_code: Optional[int]
    precipitation_probability: Optional[float]
    precipitation_amount: Optional[float]


def _first_period_with(item_data: dict, getter) -> Optional[object]:
    for key in _PERIOD_KEYS:
        value = getter(item_data.get(key) or {})

        if value is not None:
            return value

    return None


def parse_timeseries(payload: dict, tz: tzinfo) -> list[ForecastPoint]:
    """
    Превращает ответ MET (compact или complete) в список точек,
    отсортированный по времени. Битые записи пропускаются.

    Вероятность осадков есть только в формате complete: если её нет,
    остаётся None, а фронтенд показывает количество осадков в мм.
    """
    timeseries = ((payload.get("properties") or {}).get("timeseries")) or []

    points: list[ForecastPoint] = []

    for item in timeseries:
        try:
            utc_time = datetime.fromisoformat(item["time"].replace("Z", "+00:00"))
        except (KeyError, AttributeError, ValueError):
            continue

        data = item.get("data") or {}
        details = (data.get("instant") or {}).get("details") or {}

        temperature = details.get("air_temperature")

        if temperature is None:
            continue

        symbol = _first_period_with(
            data, lambda period: (period.get("summary") or {}).get("symbol_code")
        )

        wind_speed = details.get("wind_speed")

        points.append(
            ForecastPoint(
                local_time=utc_time.astimezone(tz).replace(tzinfo=None),
                temperature=float(temperature),
                # MET отдаёт ветер в м/с, на сайте — км/ч.
                wind_speed_kmh=(
                    round(float(wind_speed) * 3.6, 1) if wind_speed is not None else 0.0
                ),
                weather_code=symbol_to_wmo(symbol) if symbol else None,
                precipitation_probability=_first_period_with(
                    data,
                    lambda period: (period.get("details") or {}).get(
                        "probability_of_precipitation"
                    ),
                ),
                precipitation_amount=_first_period_with(
                    data,
                    lambda period: (period.get("details") or {}).get(
                        "precipitation_amount"
                    ),
                ),
            )
        )

    points.sort(key=lambda point: point.local_time)

    return points


# --- Сводки для API ---------------------------------------------------------


def _day_weather_code(day_points: list[ForecastPoint]) -> Optional[int]:
    """
    "Погода дня": преобладающий код среди дневных точек. Но если
    осадки занимают хотя бы треть дня, показываем их — для решения
    идти ли на тренировку важнее "дождь после обеда", чем "в целом
    облачно".
    """
    daytime = [
        point
        for point in day_points
        if point.weather_code is not None and point.local_time.hour in _DAYTIME_HOURS
    ]

    # Ночью (например, у края прогноза) дневных точек может не быть.
    codes = [point.weather_code for point in daytime] or [
        point.weather_code for point in day_points if point.weather_code is not None
    ]

    if not codes:
        return None

    # 51 и выше — морось, дождь, снег, ливни, гроза (туман — 45).
    precipitation_codes = [code for code in codes if code >= 51]

    if len(precipitation_codes) / len(codes) >= _PRECIPITATION_SHARE:
        codes = precipitation_codes

    # При равенстве голосов берём "более тяжёлую" погоду: код выше.
    counts = Counter(codes)

    return max(counts, key=lambda code: (counts[code], code))


def daily_summary(points: list[ForecastPoint], day: date) -> Optional[dict]:
    """Погода на местный календарный день или None, если дня нет в прогнозе."""
    day_points = [point for point in points if point.local_time.date() == day]

    code = _day_weather_code(day_points)

    if not day_points or code is None:
        return None

    temperatures = [point.temperature for point in day_points]

    return {
        "weatherCode": code,
        "temperatureMax": round(max(temperatures), 1),
        "temperatureMin": round(min(temperatures), 1),
    }


def hourly_summary(points: list[ForecastPoint], target: datetime) -> Optional[dict]:
    """
    Погода на момент начала события (местное время) — по ближайшей
    точке прогноза. None, если прогноза на это время нет.
    """
    candidates = [point for point in points if point.weather_code is not None]

    if not candidates:
        return None

    best = min(
        candidates,
        key=lambda point: abs((point.local_time - target).total_seconds()),
    )

    # Событие заметно позже последней точки прогноза — данных нет.
    # До первой точки такого ограничения нет: если событие сегодня и
    # уже началось, покажем текущую погоду с пометкой про время.
    if target - best.local_time > _MAX_GAP_AFTER_FORECAST:
        return None

    return {
        "temperature": round(best.temperature, 1),
        "weatherCode": best.weather_code,
        "precipitationProbability": best.precipitation_probability,
        "precipitationAmount": best.precipitation_amount,
        "windSpeed": best.wind_speed_kmh,
        "matchedTime": best.local_time.strftime("%Y-%m-%dT%H:%M"),
        "isExactHour": abs(best.local_time - target) <= _EXACT_MATCH_TOLERANCE,
    }
