"""
Температура воздуха для тренировочной записи.

Когда запись создаётся с площадкой, один раз смотрим, сколько градусов
сейчас на координатах этой площадки, и сохраняем число прямо в записи
(WorkoutEntry.temperature_c) — дальше страница записи просто его
показывает, без обращений к сервису погоды. Если площадки нет,
температуру не указываем.

Источник — тот же MET Norway, что и для погоды у событий (из РФ он
открывается, в отличие от Open-Meteo). Но у MET только прогноз — «с
текущего часа и дальше», истории погоды у него нет. Поэтому температура
определяется только для записей с сегодняшней датой (по времени
площадки): берётся температура по ближайшей к текущему моменту точке
прогноза. Для тренировки это приблизительное значение — точное время
тренировки не важно. Для записей с другой датой температуры нет.

Всё это «лучшее из возможного»: недоступность сервиса погоды не должна
мешать сохранить запись, поэтому любая ошибка даёт None.
"""

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import httpx

from app.met_weather import ForecastPoint, parse_timeseries, timezone_for

# Адрес, User-Agent и кэш прогнозов — общие с погодой у событий (см.
# routers/external.py): один ответ MET годится и там, и здесь, а за 15
# минут все записи с одной площадки обходятся одним запросом.
from app.routers.external import (
    _HTTP_USER_AGENT,
    _MET_FORECAST_URL,
    _forecast_cache,
    _round_coord,
)

logger = logging.getLogger(__name__)

# Сохранение записи не должно долго ждать погоду: если MET не ответил
# за это время, запись сохраняется без температуры.
_HTTP_TIMEOUT_SECONDS = 5

# Ближайшая точка прогноза дальше этого от текущего момента — данных
# для «сейчас» нет (обычно точки идут каждый час).
_MAX_DISTANCE_FROM_NOW = timedelta(hours=3)


def _load_points_sync(latitude: float, longitude: float) -> list[ForecastPoint]:
    """
    Ряд точек прогноза для координат (время — местное для площадки) или
    пустой список, если сервис не ответил. Использует общий кэш.
    """
    rounded_latitude = _round_coord(latitude)
    rounded_longitude = _round_coord(longitude)
    cache_key = f"{rounded_latitude}:{rounded_longitude}"

    cached = _forecast_cache.get(cache_key)

    if cached is not None:
        return cached

    try:
        with httpx.Client(
            timeout=_HTTP_TIMEOUT_SECONDS,
            follow_redirects=True,
            headers={
                "User-Agent": _HTTP_USER_AGENT,
                "Accept": "application/json",
            },
        ) as client:
            response = client.get(
                _MET_FORECAST_URL,
                params={"lat": rounded_latitude, "lon": rounded_longitude},
            )

        if response.status_code != 200:
            logger.warning(
                "MET Norway ответил %s (lat=%s, lon=%s): %s",
                response.status_code,
                rounded_latitude,
                rounded_longitude,
                response.text[:300],
            )
            return []

        points = parse_timeseries(
            response.json(), timezone_for(rounded_latitude, rounded_longitude)
        )
    except (httpx.HTTPError, ValueError) as error:
        logger.warning(
            "Не удалось получить погоду для записи (lat=%s, lon=%s): %r",
            rounded_latitude,
            rounded_longitude,
            error,
        )
        return []

    _forecast_cache.set(cache_key, points)

    return points


def pick_current_temperature(
    points: list[ForecastPoint], now_local: datetime
) -> Optional[float]:
    """Температура по ближайшей к моменту точке прогноза; None, если точек нет."""
    if not points:
        return None

    nearest = min(
        points,
        key=lambda point: abs((point.local_time - now_local).total_seconds()),
    )

    if abs(nearest.local_time - now_local) > _MAX_DISTANCE_FROM_NOW:
        return None

    return round(nearest.temperature, 1)


def temperature_for_entry(
    latitude: float,
    longitude: float,
    entry_date: date,
    now: Optional[datetime] = None,
) -> Optional[float]:
    """
    Температура воздуха для записи с этой датой на этих координатах или
    None. Определяется только для сегодняшней (по времени площадки)
    даты — у MET нет истории; для других дат запрос к сервису даже не
    делается.
    """
    zone = timezone_for(_round_coord(latitude), _round_coord(longitude))
    now_local = (now or datetime.now(timezone.utc)).astimezone(zone).replace(
        tzinfo=None
    )

    if entry_date != now_local.date():
        return None

    return pick_current_temperature(
        _load_points_sync(latitude, longitude), now_local
    )
