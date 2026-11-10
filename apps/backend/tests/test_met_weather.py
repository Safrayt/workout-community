"""
Тесты разбора прогноза MET Norway (app/met_weather.py).

Сети и базы не нужно: на вход подаётся ответ MET в том виде, как он
приходит от api.met.no, а проверяется перевод времени из UTC в
местное, коды погоды и выбор точки прогноза под время события.
"""

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.met_weather import (
    daily_summary,
    hourly_summary,
    parse_timeseries,
    resolve_timezone,
    symbol_to_wmo,
)

MOSCOW = ZoneInfo("Europe/Moscow")  # UTC+3 круглый год


def _item(
    utc_time: str,
    *,
    temperature: float = 5.0,
    wind: float = 2.0,
    symbol: str | None = "cloudy",
    probability: float | None = 20,
    amount: float | None = 0.0,
    period: str = "next_1_hours",
) -> dict:
    """Одна запись timeseries в формате ответа MET (complete)."""
    data: dict = {
        "instant": {
            "details": {"air_temperature": temperature, "wind_speed": wind}
        }
    }

    if symbol is not None:
        details: dict = {}

        if amount is not None:
            details["precipitation_amount"] = amount

        if probability is not None:
            details["probability_of_precipitation"] = probability

        data[period] = {"summary": {"symbol_code": symbol}, "details": details}

    return {"time": utc_time, "data": data}


def _payload(*items: dict) -> dict:
    return {"properties": {"timeseries": list(items)}}


def _hourly_day(utc_day: str, symbols_by_utc_hour: dict[int, str]) -> list[dict]:
    """Почасовые записи за сутки UTC; погода по умолчанию — 'cloudy'."""
    return [
        _item(
            f"{utc_day}T{hour:02d}:00:00Z",
            temperature=float(hour),
            symbol=symbols_by_utc_hour.get(hour, "cloudy"),
        )
        for hour in range(24)
    ]


# --- Коды погоды ------------------------------------------------------------


def test_symbol_to_wmo_ignores_day_night_suffix():
    assert symbol_to_wmo("clearsky_day") == 0
    assert symbol_to_wmo("clearsky_night") == 0
    assert symbol_to_wmo("clearsky_polartwilight") == 0
    assert symbol_to_wmo("partlycloudy_day") == 2
    assert symbol_to_wmo("cloudy") == 3


def test_symbol_to_wmo_precipitation():
    assert symbol_to_wmo("lightrain") == 61
    assert symbol_to_wmo("rain") == 63
    assert symbol_to_wmo("heavyrain") == 65
    assert symbol_to_wmo("rainshowers_day") == 81
    assert symbol_to_wmo("lightsnow") == 71
    assert symbol_to_wmo("heavysnowshowers_night") == 86
    assert symbol_to_wmo("sleet") == 67


def test_symbol_to_wmo_thunder_variants_become_thunderstorm():
    assert symbol_to_wmo("rainandthunder") == 95
    assert symbol_to_wmo("lightrainshowersandthunder_day") == 95
    assert symbol_to_wmo("heavyrainandthunder") == 99
    assert symbol_to_wmo("heavysnowshowersandthunder_night") == 99


def test_symbol_to_wmo_unknown_is_none():
    assert symbol_to_wmo("something_new_day") is None
    assert symbol_to_wmo("") is None


# --- Часовой пояс -----------------------------------------------------------


def test_resolve_timezone_uses_zone_name():
    assert resolve_timezone("Europe/Moscow", 37.6) == MOSCOW


def test_resolve_timezone_falls_back_to_longitude():
    moscow_like = resolve_timezone(None, 45.0)  # 45 / 15 = UTC+3
    unknown_name = resolve_timezone("Mars/Olympus_Mons", 30.0)  # UTC+2

    reference = datetime(2026, 11, 12, 12, 0, tzinfo=timezone.utc)

    assert moscow_like.utcoffset(reference.replace(tzinfo=None)) == timedelta(hours=3)
    assert unknown_name.utcoffset(reference.replace(tzinfo=None)) == timedelta(hours=2)


# --- Разбор ответа ----------------------------------------------------------


def test_parse_converts_utc_to_local_and_wind_to_kmh():
    points = parse_timeseries(
        _payload(_item("2026-11-12T07:00:00Z", temperature=3.4, wind=5.0)), MOSCOW
    )

    assert len(points) == 1
    assert points[0].local_time == datetime(2026, 11, 12, 10, 0)
    assert points[0].temperature == 3.4
    assert points[0].wind_speed_kmh == 18.0
    assert points[0].weather_code == 3


def test_parse_sorts_by_time_and_skips_broken_items():
    points = parse_timeseries(
        _payload(
            _item("2026-11-12T09:00:00Z"),
            {"time": "не время", "data": {}},
            {"data": {"instant": {"details": {"air_temperature": 1}}}},
            {"time": "2026-11-12T08:00:00Z", "data": {"instant": {"details": {}}}},
            _item("2026-11-12T07:00:00Z"),
        ),
        MOSCOW,
    )

    assert [p.local_time.hour for p in points] == [10, 12]


def test_parse_takes_symbol_from_coarser_period_when_hourly_is_missing():
    far = _item("2026-11-18T06:00:00Z", symbol="rain", period="next_6_hours")

    points = parse_timeseries(_payload(far), MOSCOW)

    assert points[0].weather_code == 63


def test_parse_without_probability_keeps_none():
    # Формат compact: вероятности осадков в нём нет.
    points = parse_timeseries(
        _payload(_item("2026-11-12T07:00:00Z", probability=None, amount=1.2)), MOSCOW
    )

    assert points[0].precipitation_probability is None
    assert points[0].precipitation_amount == 1.2


def test_parse_empty_payload():
    assert parse_timeseries({}, MOSCOW) == []
    assert parse_timeseries({"properties": {}}, MOSCOW) == []


# --- Погода на час начала события -------------------------------------------


def test_hourly_exact_hour():
    points = parse_timeseries(
        _payload(
            _item("2026-11-12T06:00:00Z"),
            _item(
                "2026-11-12T07:00:00Z",
                temperature=2.0,
                wind=10.0,
                symbol="lightrain_day",
                probability=70,
                amount=0.6,
            ),
            _item("2026-11-12T08:00:00Z"),
        ),
        MOSCOW,
    )

    result = hourly_summary(points, datetime(2026, 11, 12, 10, 0))

    assert result == {
        "temperature": 2.0,
        "weatherCode": 61,
        "precipitationProbability": 70,
        "precipitationAmount": 0.6,
        "windSpeed": 36.0,
        "matchedTime": "2026-11-12T10:00",
        "isExactHour": True,
    }


def test_hourly_minutes_still_match_the_hour():
    points = parse_timeseries(_payload(_item("2026-11-12T07:00:00Z")), MOSCOW)

    result = hourly_summary(points, datetime(2026, 11, 12, 10, 20))

    assert result["isExactHour"] is True


def test_hourly_picks_nearest_point_and_flags_it_when_data_is_coarse():
    # Дальше трёх суток точки идут раз в 6 часов: 06:00 и 12:00 по Москве.
    points = parse_timeseries(
        _payload(
            _item("2026-11-18T03:00:00Z", symbol="fair", period="next_6_hours"),
            _item("2026-11-18T09:00:00Z", symbol="rain", period="next_6_hours"),
        ),
        MOSCOW,
    )

    result = hourly_summary(points, datetime(2026, 11, 18, 10, 0))

    assert result["matchedTime"] == "2026-11-18T12:00"
    assert result["weatherCode"] == 63
    assert result["isExactHour"] is False


def test_hourly_event_after_the_forecast_has_no_data():
    points = parse_timeseries(_payload(_item("2026-11-12T07:00:00Z")), MOSCOW)

    assert hourly_summary(points, datetime(2026, 11, 14, 10, 0)) is None


def test_hourly_event_earlier_today_shows_the_first_available_hour():
    # Событие было в 07:00, а ряд прогноза начинается с текущего часа (15:00).
    points = parse_timeseries(_payload(_item("2026-11-12T12:00:00Z")), MOSCOW)

    result = hourly_summary(points, datetime(2026, 11, 12, 7, 0))

    assert result["matchedTime"] == "2026-11-12T15:00"
    assert result["isExactHour"] is False


def test_hourly_ignores_points_without_weather_symbol():
    points = parse_timeseries(
        _payload(
            _item("2026-11-12T07:00:00Z", symbol=None),
            _item("2026-11-12T08:00:00Z", symbol="clearsky_day"),
        ),
        MOSCOW,
    )

    result = hourly_summary(points, datetime(2026, 11, 12, 10, 0))

    assert result["matchedTime"] == "2026-11-12T11:00"


def test_hourly_empty_forecast():
    assert hourly_summary([], datetime(2026, 11, 12, 10, 0)) is None


# --- Погода на день ---------------------------------------------------------


def test_daily_min_max_use_local_day_not_utc_day():
    # 22:00 UTC 11 ноября — уже 01:00 12 ноября по Москве.
    points = parse_timeseries(
        _payload(
            _item("2026-11-11T22:00:00Z", temperature=-5.0),
            _item("2026-11-12T09:00:00Z", temperature=4.0),
            _item("2026-11-12T20:00:00Z", temperature=-1.0),
            _item("2026-11-12T21:00:00Z", temperature=-9.0),  # 13 ноября, 00:00
        ),
        MOSCOW,
    )

    result = daily_summary(points, date(2026, 11, 12))

    assert result["temperatureMin"] == -5.0
    assert result["temperatureMax"] == 4.0


def test_daily_picks_prevailing_daytime_weather():
    # Местные 08:00–20:00 = 05:00–17:00 UTC: 13 точек, 10 пасмурных.
    points = parse_timeseries(
        _payload(*_hourly_day("2026-11-12", {7: "rain", 8: "rain", 9: "rain"})),
        MOSCOW,
    )

    # Осадки в 3 из 13 дневных точек — меньше трети, остаётся "пасмурно".
    assert daily_summary(points, date(2026, 11, 12))["weatherCode"] == 3


def test_daily_shows_precipitation_when_it_covers_a_third_of_the_day():
    rainy = {hour: "rain" for hour in range(9, 14)}  # 5 из 13 дневных точек

    points = parse_timeseries(
        _payload(*_hourly_day("2026-11-12", rainy)), MOSCOW
    )

    assert daily_summary(points, date(2026, 11, 12))["weatherCode"] == 63


def test_daily_without_data_for_the_day_is_none():
    points = parse_timeseries(_payload(_item("2026-11-12T07:00:00Z")), MOSCOW)

    assert daily_summary(points, date(2026, 11, 20)) is None
    assert daily_summary([], date(2026, 11, 12)) is None


def test_daily_at_the_edge_of_forecast_uses_night_points_if_no_daytime():
    # Только ночная точка: 22:00 UTC = 01:00 местного.
    points = parse_timeseries(
        _payload(_item("2026-11-11T22:00:00Z", symbol="clearsky_night")), MOSCOW
    )

    result = daily_summary(points, date(2026, 11, 12))

    assert result["weatherCode"] == 0
