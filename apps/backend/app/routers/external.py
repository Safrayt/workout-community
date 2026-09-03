"""
Прокси к внешним публичным сервисам (Open-Meteo, Nominatim), которые
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

Оба эндпоинта отдают 404, если для запроса нет данных (например,
дата вне окна прогноза) — фронтенд (services/weather.ts,
services/geocoding.ts) на этот случай трактует 404 как "нет данных"
и возвращает null, сохраняя тот же контракт, что был при прямом
вызове внешнего API.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.external_cache import TTLCache
from app.rate_limit import RateLimiter

router = APIRouter(prefix="/external", tags=["external"])

# Не про безопасность (данные не приватные и не платные) — просто
# чтобы один клиент, залипший в цикле или багнутым фронтендом, не
# мог в одиночку нагенерировать сотни запросов к Open-Meteo/Nominatim
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

_daily_weather_cache = TTLCache(_WEATHER_TTL_SECONDS)
_hourly_weather_cache = TTLCache(_WEATHER_TTL_SECONDS)
_geocode_cache = TTLCache(_GEOCODE_TTL_SECONDS)

# Nominatim требует идентифицирующий User-Agent (usage policy:
# https://operations.osmfoundation.org/policies/nominatim/).
# ВАЖНО: замените example.com/почту на свои перед деплоем — это не
# секрет, а контакт на случай, если OSM понадобится с вами связаться
# по поводу нагрузки на их сервис.
_NOMINATIM_USER_AGENT = (
    "WorkoutCommunity/1.0 (+https://example.com; contact: admin@example.com)"
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


@router.get(
    "/weather/daily",
    dependencies=[Depends(_external_rate_limit)],
)
async def get_daily_weather(
    latitude: float = Query(...),
    longitude: float = Query(...),
    date: str = Query(..., description="Дата в формате YYYY-MM-DD"),
) -> dict:
    cache_key = f"{_round_coord(latitude)}:{_round_coord(longitude)}:{date}"

    cached = _daily_weather_cache.get(cache_key)

    if cached is not None:
        return cached

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitude}&longitude={longitude}"
        "&daily=weathercode,temperature_2m_max,temperature_2m_min"
        f"&timezone=auto&start_date={date}&end_date={date}"
    )

    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT_SECONDS) as client:
        try:
            response = await client.get(url)
        except httpx.HTTPError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Сервис прогноза погоды сейчас недоступен.",
            )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Сервис прогноза погоды вернул ошибку.",
        )

    data = response.json()
    daily = data.get("daily") or {}

    weather_codes = daily.get("weathercode") or []
    temps_max = daily.get("temperature_2m_max") or []
    temps_min = daily.get("temperature_2m_min") or []

    if not weather_codes or not temps_max or not temps_min:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Прогноз на эту дату недоступен.",
        )

    result = {
        "weatherCode": weather_codes[0],
        "temperatureMax": temps_max[0],
        "temperatureMin": temps_min[0],
    }

    _daily_weather_cache.set(cache_key, result)

    return result


@router.get(
    "/weather/hourly",
    dependencies=[Depends(_external_rate_limit)],
)
async def get_hourly_weather(
    latitude: float = Query(...),
    longitude: float = Query(...),
    start: str = Query(
        ..., description="ISO-время начала события, напр. 2026-08-18T10:00"
    ),
) -> dict:
    date_string = start[:10]
    target_hour_key = start[:13]  # "2026-08-18T10"

    # Кэш — на весь день и координату, а не на конкретный запрошенный
    # час: несколько событий в один день на одной площадке переиспользуют
    # один и тот же вызов внешнего API, подбор часа происходит уже
    # локально при каждом запросе.
    raw_cache_key = f"{_round_coord(latitude)}:{_round_coord(longitude)}:{date_string}"

    raw = _hourly_weather_cache.get(raw_cache_key)

    if raw is None:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={latitude}&longitude={longitude}"
            "&hourly=temperature_2m,weathercode,precipitation_probability,windspeed_10m"
            f"&timezone=auto&start_date={date_string}&end_date={date_string}"
        )

        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT_SECONDS) as client:
            try:
                response = await client.get(url)
            except httpx.HTTPError:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Сервис прогноза погоды сейчас недоступен.",
                )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Сервис прогноза погоды вернул ошибку.",
            )

        data = response.json()
        hourly = data.get("hourly") or {}

        raw = {
            "times": hourly.get("time") or [],
            "temperatures": hourly.get("temperature_2m") or [],
            "weatherCodes": hourly.get("weathercode") or [],
            "precipitationProbabilities": hourly.get(
                "precipitation_probability"
            )
            or [],
            "windSpeeds": hourly.get("windspeed_10m") or [],
        }

        _hourly_weather_cache.set(raw_cache_key, raw)

    times = raw["times"]

    if not times:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Прогноз на эту дату недоступен.",
        )

    best_index = 0
    is_exact_hour = False

    for index, time_value in enumerate(times):
        if time_value[:13] == target_hour_key:
            best_index = index
            is_exact_hour = True
            break

    if not is_exact_hour:
        # Точного часа нет — берём ближайший по времени и явно
        # помечаем это в ответе (фронтенд показывает пометку
        # "ближайший доступный час", а не выдаёт его за точный).
        from datetime import datetime

        target_time = datetime.fromisoformat(start)
        min_diff = None

        for index, time_value in enumerate(times):
            candidate_time = datetime.fromisoformat(time_value)
            diff = abs((candidate_time - target_time).total_seconds())

            if min_diff is None or diff < min_diff:
                min_diff = diff
                best_index = index

    temperatures = raw["temperatures"]
    weather_codes = raw["weatherCodes"]

    if (
        best_index >= len(temperatures)
        or best_index >= len(weather_codes)
        or temperatures[best_index] is None
        or weather_codes[best_index] is None
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Прогноз на этот час недоступен.",
        )

    precipitation_probabilities = raw["precipitationProbabilities"]
    wind_speeds = raw["windSpeeds"]

    return {
        "temperature": temperatures[best_index],
        "weatherCode": weather_codes[best_index],
        "precipitationProbability": (
            precipitation_probabilities[best_index]
            if best_index < len(precipitation_probabilities)
            and precipitation_probabilities[best_index] is not None
            else 0
        ),
        "windSpeed": (
            wind_speeds[best_index]
            if best_index < len(wind_speeds) and wind_speeds[best_index] is not None
            else 0
        ),
        "matchedTime": times[best_index],
        "isExactHour": is_exact_hour,
    }


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
        headers={
            "User-Agent": _NOMINATIM_USER_AGENT,
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
