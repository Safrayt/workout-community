"""
Температура воздуха в тренировочной записи. При создании записи с
площадкой сервер один раз смотрит температуру по координатам площадки
(MET Norway — только прогноз, истории у него нет, поэтому температура
определяется для записей с сегодняшней датой) и сохраняет её в записи.
Нет площадки — нет температуры.
"""

from datetime import date, datetime, timedelta, timezone

from app.met_weather import ForecastPoint
from app.workout_weather import (
    pick_current_temperature,
    temperature_for_entry,
)
from conftest import auth_headers, register_user

PLAYGROUND_PAYLOAD = {
    "name": "Площадка с погодой",
    "locality": "Рига",
    "address": "ул. Тестовая, 1",
    "latitude": 56.95,
    "longitude": 24.10,
    "size": "medium",
    "surface": "rubber",
    "access": "free",
    "condition": "acceptable",
    "opening_hours": "круглосуточно",
    "equipment": [],
}


def _point(local_time: datetime, temperature: float) -> ForecastPoint:
    return ForecastPoint(
        local_time=local_time,
        temperature=temperature,
        wind_speed_kmh=0.0,
        weather_code=None,
        precipitation_probability=None,
        precipitation_amount=None,
    )


# --- Выбор точки прогноза ---------------------------------------------------


def test_nearest_point_to_now_is_used():
    now = datetime(2026, 11, 14, 14, 20)
    points = [
        _point(datetime(2026, 11, 14, 13, 0), 3.0),
        _point(datetime(2026, 11, 14, 14, 0), 4.04),
        _point(datetime(2026, 11, 14, 15, 0), 5.0),
    ]

    assert pick_current_temperature(points, now) == 4.0


def test_no_points_means_no_temperature():
    assert pick_current_temperature([], datetime(2026, 11, 14, 14, 20)) is None


def test_forecast_far_from_now_is_not_used():
    now = datetime(2026, 11, 14, 14, 20)
    points = [_point(datetime(2026, 11, 14, 22, 0), 1.0)]

    assert pick_current_temperature(points, now) is None


def test_negative_temperature_is_kept():
    now = datetime(2026, 1, 10, 9, 0)

    assert (
        pick_current_temperature([_point(datetime(2026, 1, 10, 9, 0), -12.3)], now)
        == -12.3
    )


# --- Температура по дате и координатам --------------------------------------


def test_only_todays_entries_get_a_temperature(monkeypatch):
    calls = []

    def fake_load(latitude, longitude):
        calls.append((latitude, longitude))
        return [_point(datetime(2026, 11, 14, 12, 0), 7.0)]

    monkeypatch.setattr("app.workout_weather._load_points_sync", fake_load)

    # Рига зимой — UTC+2: 10:00 UTC = 12:00 по Риге.
    now = datetime(2026, 11, 14, 10, 0, tzinfo=timezone.utc)

    assert temperature_for_entry(56.95, 24.10, date(2026, 11, 14), now) == 7.0
    assert len(calls) == 1

    # Вчерашняя запись — истории у MET нет: ответа нет и запрос не делается.
    assert temperature_for_entry(56.95, 24.10, date(2026, 11, 13), now) is None
    assert len(calls) == 1


def test_date_is_compared_in_the_playgrounds_timezone(monkeypatch):
    monkeypatch.setattr(
        "app.workout_weather._load_points_sync",
        lambda *_: [_point(datetime(2026, 11, 15, 0, 0), 2.0)],
    )

    # 23:30 UTC 14 ноября — уже 15 ноября по Риге (UTC+2).
    now = datetime(2026, 11, 14, 22, 30, tzinfo=timezone.utc)

    assert temperature_for_entry(56.95, 24.10, date(2026, 11, 15), now) == 2.0
    assert temperature_for_entry(56.95, 24.10, date(2026, 11, 14), now) is None


def test_unavailable_weather_service_gives_no_temperature(monkeypatch):
    # Сервис не ответил — пустой ряд; запись при этом не ломается.
    monkeypatch.setattr("app.workout_weather._load_points_sync", lambda *_: [])

    assert temperature_for_entry(56.95, 24.10, date.today()) is None


# --- Запись через API -----------------------------------------------------------


def _create_playground(client, token) -> int:
    response = client.post(
        "/playgrounds/", json=PLAYGROUND_PAYLOAD, headers=auth_headers(token)
    )
    assert response.status_code == 200, response.text

    return response.json()["id"]


def _entry_payload(**fields) -> dict:
    return {
        "date": date.today().isoformat(),
        "title": "Тренировка",
        "description": "",
        "tags": [],
        **fields,
    }


def _create_entry(client, token, **fields):
    response = client.post(
        "/diary/entries",
        json=_entry_payload(**fields),
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text

    return response.json()


def _stub_temperature(monkeypatch, value=7.5):
    calls = []

    def fake(latitude, longitude, entry_date):
        calls.append((latitude, longitude, entry_date))
        return value

    monkeypatch.setattr("app.routers.diary.temperature_for_entry", fake)

    return calls


def test_entry_with_playground_gets_the_temperature(client, monkeypatch):
    user = register_user(client, nickname="temp_author")
    playground_id = _create_playground(client, user["token"])
    calls = _stub_temperature(monkeypatch, 7.5)

    entry = _create_entry(client, user["token"], playground_id=playground_id)

    assert entry["temperature_c"] == 7.5
    # Смотрим по координатам площадки и дате записи — один раз.
    assert calls == [(56.95, 24.10, date.today())]

    # Число хранится в записи — повторное чтение не обращается к погоде.
    fetched = client.get(
        f"/diary/entries/{entry['id']}", headers=auth_headers(user["token"])
    )
    assert fetched.json()["temperature_c"] == 7.5
    assert len(calls) == 1


def test_entry_without_playground_has_no_temperature(client, monkeypatch):
    user = register_user(client, nickname="temp_no_playground")
    calls = _stub_temperature(monkeypatch)

    entry = _create_entry(client, user["token"])

    assert entry["temperature_c"] is None
    assert calls == []


def test_entry_is_saved_even_if_weather_lookup_crashes(client, monkeypatch):
    user = register_user(client, nickname="temp_crash")
    playground_id = _create_playground(client, user["token"])

    def broken(*_):
        raise RuntimeError("сервис погоды упал")

    monkeypatch.setattr("app.routers.diary.temperature_for_entry", broken)

    entry = _create_entry(client, user["token"], playground_id=playground_id)

    assert entry["temperature_c"] is None
    assert entry["title"] == "Тренировка"


def test_entry_with_unknown_playground_has_no_temperature(client, monkeypatch):
    user = register_user(client, nickname="temp_unknown_playground")
    calls = _stub_temperature(monkeypatch)

    entry = _create_entry(client, user["token"], playground_id=424242)

    assert entry["temperature_c"] is None
    assert calls == []


def test_temperature_cannot_be_set_by_the_client(client, monkeypatch):
    user = register_user(client, nickname="temp_forged")
    playground_id = _create_playground(client, user["token"])
    _stub_temperature(monkeypatch, 7.5)

    entry = _create_entry(
        client,
        user["token"],
        playground_id=playground_id,
        temperature_c=-99,
    )

    assert entry["temperature_c"] == 7.5


def _update_entry(client, token, entry_id, **fields):
    response = client.put(
        f"/diary/entries/{entry_id}",
        json=fields,
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text

    return response.json()


def test_unrelated_edit_keeps_the_temperature(client, monkeypatch):
    user = register_user(client, nickname="temp_keep")
    playground_id = _create_playground(client, user["token"])
    calls = _stub_temperature(monkeypatch, 7.5)
    entry = _create_entry(client, user["token"], playground_id=playground_id)

    updated = _update_entry(
        client,
        user["token"],
        entry["id"],
        title="Новое название",
        playground_id=playground_id,
        date=date.today().isoformat(),
    )

    assert updated["temperature_c"] == 7.5
    assert len(calls) == 1


def test_removing_the_playground_removes_the_temperature(client, monkeypatch):
    user = register_user(client, nickname="temp_remove")
    playground_id = _create_playground(client, user["token"])
    _stub_temperature(monkeypatch, 7.5)
    entry = _create_entry(client, user["token"], playground_id=playground_id)

    updated = _update_entry(
        client, user["token"], entry["id"], playground_id=None
    )

    assert updated["temperature_c"] is None


def test_changing_the_date_looks_the_temperature_up_again(client, monkeypatch):
    user = register_user(client, nickname="temp_new_date")
    playground_id = _create_playground(client, user["token"])
    calls = _stub_temperature(monkeypatch, 7.5)
    entry = _create_entry(client, user["token"], playground_id=playground_id)

    yesterday = date.today() - timedelta(days=1)
    _stub_temperature(monkeypatch, None)  # у MET нет истории

    updated = _update_entry(
        client, user["token"], entry["id"], date=yesterday.isoformat()
    )

    assert updated["temperature_c"] is None
    assert len(calls) == 1  # первое обращение — при создании


def test_missing_temperature_is_retried_on_edit(client, monkeypatch):
    user = register_user(client, nickname="temp_retry")
    playground_id = _create_playground(client, user["token"])

    # При создании сервис погоды не ответил ...
    _stub_temperature(monkeypatch, None)
    entry = _create_entry(client, user["token"], playground_id=playground_id)
    assert entry["temperature_c"] is None

    # ... а при следующем редактировании ответил.
    _stub_temperature(monkeypatch, 3.0)
    updated = _update_entry(client, user["token"], entry["id"], title="Ещё")

    assert updated["temperature_c"] == 3.0


def test_entry_for_playground_without_title_change_keeps_response_shape(
    client, monkeypatch
):
    # Записи без площадки отдают temperature_c: null, а не пропускают поле.
    user = register_user(client, nickname="temp_shape")
    _stub_temperature(monkeypatch)

    entry = _create_entry(client, user["token"])

    assert "temperature_c" in entry
    assert entry["temperature_c"] is None
