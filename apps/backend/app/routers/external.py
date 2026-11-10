"""
Прокси к внешним публичным сервисам (MET Norway, Nominatim), которые
раньше вызывались напрямую из браузера пользователя. Два повода
завести именно бэкенд-прокси, а не оставить как было:

1. У Nominatim (OpenStreetMap) есть usage policy: нужен осмысленный
   User-Agent, не более ~1 запроса/сек, и рекомендация кэшировать
   результат самостоятельно, а не дёргать сервис заново при каждом
   визите страницы. Из браузера правильный User-Agent не выставить
   (браузер сам его переопределяет), а с бэкенда — можно и нужно.
2. Кэш здесь общий для всех пользователей: если событие или площадка
   популярны, координаты одни и те же, и десятки посетителей за
   TTL-окно обернутся одним запросом к внешнему сервису, а не
   десятками.

Погода берётся у MET Norway (api.met.no), а не у Open-Meteo: сервер
расположен в РФ, и api.open-meteo.com оттуда недоступен. Разбор
ответа MET (часовой пояс площадки, коды погоды, подбор часа под
время события) вынесен в app/met_weather.py.

Оба эндпоинта погоды отдают 404, если для запроса нет данных (например,
дата вне окна прогноза) — фронтенд (services/weather.ts,
services/geocoding.ts) на этот случай трактует 404 как "нет данных"
и возвращает null, сохраняя тот же контракт, что был при прямом
вызове внешнего API.
"""

import logging
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.external_cache import TTLCache
from app.met_weather import (
    ForecastPoint,
    daily_summary,
    hourly_summary,
    parse_timeseries,
    timezone_for,
)
from app.rate_limit import RateLimiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/external", tags=["external"])

# Не про безопасность (данные не приватные и не платные) — просто
# чтобы один клиент, залипший в цикле или багнутым фронтендом, не
# мог в одиночку нагенерировать сотни запросов к MET Norway/Nominatim
# в минуту и не приблизить нас к их лимитам.
_external_rate_limit = RateLimiter(max_requests=60, window_seconds=60)

# Прогноз погоды устаревает быстро, но не поминутно — 15 минут
# ощутимо снижают число внешних запросов, оставаясь незаметными для
# пользователя (за 15 минут прогноз практически не меняется).
_WEATHER_TTL_SECONDS = 15 * 60

# Адрес по координатам почти никогда не меняется — можно кэшировать
# надолго. Если площадку физически перенесут (что бывает крайне
# редко), несколько дней со старым адресом в кэше не страшны.
_GEOCODE_TTL_SECONDS = 7 * 24 * 60 * 60

# Кэш — один на оба эндпоинта погоды: из одного ответа MET получаются
# и суточная сводка, и погода на конкретный час.
_forecast_cache = TTLCache(_WEATHER_TTL_SECONDS)
_geocode_cache = TTLCache(_GEOCODE_TTL_SECONDS)

# Прогноз по координатам с точностью до 4 знаков (~11 м) — MET просит
# не присылать больше, иначе запросы кэшируются у них хуже.
_MET_FORECAST_URL = "https://api.met.no/weatherapi/locationforecast/2.0/complete"

# Nominatim (usage policy: https://operations.osmfoundation.org/policies/nominatim/)
# и MET Norway (https://api.met.no/doc/TermsOfService) требуют
# идентифицирующий User-Agent с контактом и блокируют запросы без
# него — Nominatim 403-м (это и было причиной пустых "Населённый
# пункт"/"Адрес" при добавлении площадки).
_HTTP_USER_AGENT = (
    "WorkoutCommunity/1.0 "
    "(+http://89-253-255-127.sslip.io/; contact: tyarfas@gmail.com)"
)

_HTTP_TIMEOUT_SECONDS = 10


def _round_coord(value: float) -> float:
    """
    Округление до 4 знаков (~11 метров) — увеличивает число попаданий
    в кэш: "сырые" координаты из GPS или клика по карте почти никогда
    не совпадают побитово, а с округлением два запроса про одну и ту
    же площадку в пределах десятка метров лягут в один и тот же ключ.
    """
    return round(value, 4)


async def _load_forecast_points(
    latitude: float, longitude: float
) -> list[ForecastPoint]:
    """
    Ряд точек прогноза для координат (время — местное для площадки).
    Ответ MET разбирается один раз и кладётся в общий кэш: все, кто
    смотрит события на этой площадке, за 15 минут обойдутся одним
    запросом к MET.
    """
    rounded_latitude = _round_coord(latitude)
    rounded_longitude = _round_coord(longitude)

    cache_key = f"{rounded_latitude}:{rounded_longitude}"

    cached = _forecast_cache.get(cache_key)

    if cached is not None:
        return cached

    async with httpx.AsyncClient(
        timeout=_HTTP_TIMEOUT_SECONDS,
        follow_redirects=True,
        headers={
            "User-Agent": _HTTP_USER_AGENT,
            "Accept": "application/json",
        },
    ) as client:
        try:
            response = await client.get(
                _MET_FORECAST_URL,
                params={"lat": rounded_latitude, "lon": rounded_longitude},
            )
        except httpx.HTTPError as error:
            # Пользователю — общее сообщение, а в логах — настоящая
            # причина (таймаут, блокировка сети, DNS и т.д.).
            logger.warning(
                "MET Norway недоступен (lat=%s, lon=%s): %r",
                rounded_latitude,
                rounded_longitude,
                error,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Сервис прогноза погоды сейчас недоступен.",
            )

    if response.status_code != 200:
        logger.warning(
            "MET Norway ответил %s (lat=%s, lon=%s): %s",
            response.status_code,
            rounded_latitude,
            rounded_longitude,
            response.text[:500],
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Сервис прогноза погоды вернул ошибку.",
        )

    try:
        payload = response.json()
    except ValueError:
        logger.warning(
            "MET Norway вернул не JSON (lat=%s, lon=%s): %s",
            rounded_latitude,
            rounded_longitude,
            response.text[:500],
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Сервис прогноза погоды вернул ошибку.",
        )

    points = parse_timeseries(
        payload, timezone_for(rounded_latitude, rounded_longitude)
    )

    _forecast_cache.set(cache_key, points)

    return points


@router.get(
    "/weather/daily",
    dependencies=[Depends(_external_rate_limit)],
)
async def get_daily_weather(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    date: str = Query(..., description="Дата в формате YYYY-MM-DD"),
) -> dict:
    try:
        day = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Дата должна быть в формате YYYY-MM-DD.",
        )

    points = await _load_forecast_points(latitude, longitude)

    summary = daily_summary(points, day)

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Прогноз на эту дату недоступен.",
        )

    return summary


@router.get(
    "/weather/hourly",
    dependencies=[Depends(_external_rate_limit)],
)
async def get_hourly_weather(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    start: str = Query(
        ..., description="ISO-время начала события, напр. 2026-08-18T10:00"
    ),
) -> dict:
    try:
        # Время события — местное, "настенное" (см. app/utc.py): пояс,
        # если он вдруг пришёл, отбрасываем, а не пересчитываем.
        target = datetime.fromisoformat(start).replace(tzinfo=None)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Время начала должно быть в формате ISO, напр. 2026-08-18T10:00.",
        )

    points = await _load_forecast_points(latitude, longitude)

    summary = hourly_summary(points, target)

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Прогноз на это время недоступен.",
        )

    return summary


def _build_short_address(address: dict) -> str:
    district = (
        address.get("suburb")
        or address.get("city_district")
        or address.get("district")
        or address.get("neighbourhood")
    )

    parts = [
        part
        for part in [district, address.get("road"), address.get("house_number")]
        if part
    ]

    return ", ".join(parts)


@router.get(
    "/geocode/reverse",
    dependencies=[Depends(_external_rate_limit)],
)
async def reverse_geocode(
    latitude: float = Query(...),
    longitude: float = Query(...),
) -> dict:
    cache_key = f"{_round_coord(latitude)}:{_round_coord(longitude)}"

    cached = _geocode_cache.get(cache_key)

    if cached is not None:
        return cached

    url = (
        "https://nominatim.openstreetmap.org/reverse"
        f"?lat={latitude}&lon={longitude}&format=jsonv2"
    )

    async with httpx.AsyncClient(
        timeout=_HTTP_TIMEOUT_SECONDS,
        follow_redirects=True,
        headers={
            "User-Agent": _HTTP_USER_AGENT,
            "Accept": "application/json",
        },
    ) as client:
        try:
            response = await client.get(url)
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Сервис геокодирования сейчас недоступен.",
            )

    if response.status_code != 200:
        # Логируем реальный код и тело ответа Nominatim — сообщение
        # пользователю ("Сервис геокодирования вернул ошибку.")
        # намеренно общее, а вот в логах бэкенда нужна вся правда,
        # чтобы понять, это блокировка по User-Agent (403), лимит
        # запросов (429) или что-то ещё.
        logger.warning(
            "Nominatim ответил %s на reverse-геокодирование "
            "(lat=%s, lon=%s): %s",
            response.status_code,
            latitude,
            longitude,
            response.text[:500],
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Сервис геокодирования вернул ошибку.",
        )

    data = response.json()
    address = data.get("address") or {}

    result = {
        "locality": (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("hamlet")
            or ""
        ),
        "address": _build_short_address(address),
    }

    _geocode_cache.set(cache_key, result)

    return result
