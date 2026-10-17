"""
Время в ответах API (app/utc.py).

Серверные метки времени (создано, изменено, опубликовано...) хранятся в
UTC "наивными" и должны уходить клиенту с суффиксом "Z" — иначе браузер
читает их как местное время и сдвигает на часовой пояс читателя.
Время мероприятия, наоборот, вводится как местное и должно приходить
без пояса, каким его ввели.
"""

import types
import typing
from datetime import datetime, timezone

import pytest
from fastapi.routing import APIRoute
from pydantic import BaseModel
from sqlmodel import SQLModel, select

from conftest import auth_headers, register_user

from app.main import app
from app.models import User
from app.models_event import EventRead
from app.utc import UtcDatetime, WallClock, WallClockDatetime, serialize_as_utc


class _Sample(SQLModel):
    server_time: UtcDatetime
    maybe_time: typing.Optional[UtcDatetime] = None
    local_time: WallClockDatetime


NAIVE = datetime(2026, 10, 16, 6, 28, 58, 583000)


def test_naive_server_time_is_marked_utc_in_json():
    sample = _Sample(server_time=NAIVE, maybe_time=NAIVE, local_time=NAIVE)

    data = sample.model_dump(mode="json")

    assert data["server_time"] == "2026-10-16T06:28:58.583000Z"
    assert data["maybe_time"] == "2026-10-16T06:28:58.583000Z"


def test_wall_clock_time_stays_without_zone():
    sample = _Sample(server_time=NAIVE, local_time=NAIVE)

    assert sample.model_dump(mode="json")["local_time"] == (
        "2026-10-16T06:28:58.583000"
    )


def test_missing_optional_time_stays_null():
    sample = _Sample(server_time=NAIVE, local_time=NAIVE)

    assert sample.model_dump(mode="json")["maybe_time"] is None


def test_value_in_python_is_not_changed():
    """
    Конвертация только при выводе в JSON: внутри роутеров время остаётся
    "наивным", как в базе, и его по-прежнему можно сравнивать со
    значениями из базы (см. _touch в routers/diary.py).
    """
    sample = _Sample(server_time=NAIVE, local_time=NAIVE)

    assert sample.server_time.tzinfo is None
    assert sample.server_time > datetime(2026, 1, 1)


def test_time_with_zone_is_converted_to_utc():
    from datetime import timedelta

    belgrade = timezone(timedelta(hours=2))
    value = datetime(2026, 10, 16, 8, 28, 58, tzinfo=belgrade)

    assert serialize_as_utc(value) == datetime(
        2026, 10, 16, 6, 28, 58, tzinfo=timezone.utc
    )

    sample = _Sample(server_time=value, local_time=NAIVE)

    assert sample.model_dump(mode="json")["server_time"] == (
        "2026-10-16T06:28:58Z"
    )


# ---------------------------------------------------------------------
# Настоящие запросы
# ---------------------------------------------------------------------


def test_real_endpoints_return_utc_and_keep_event_time(client, session):
    token = register_user(client, nickname="utc_user")["token"]
    headers = auth_headers(token)

    # Профиль: created_at проставил сервер.
    me = client.get("/users/me", headers=headers).json()
    assert me["created_at"].endswith("Z"), me["created_at"]

    playground = client.post(
        "/playgrounds/",
        json={
            "name": "Площадка",
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
        },
        headers=headers,
    ).json()

    # Мероприятие: сайт отправляет значение поля datetime-local —
    # "ГГГГ-ММ-ДДTЧЧ:ММ" без пояса — и должен получить его назад таким
    # же, иначе на странице мероприятия время уедет.
    event = client.post(
        "/events/",
        json={
            "title": "Тренировка",
            "description": "",
            "start_date": "2026-10-20T18:00",
            "playground_id": playground["id"],
        },
        headers=headers,
    )
    assert event.status_code == 200, event.text

    event_data = event.json()

    assert event_data["start_date"] == "2026-10-20T18:00:00"
    assert event_data["created_at"].endswith("Z")

    # То же при чтении списком.
    listed = client.get("/events/").json()
    assert listed[0]["start_date"] == "2026-10-20T18:00:00"

    # Время из базы действительно "наивное" — менять хранение не нужно.
    user = session.exec(select(User).where(User.nickname == "utc_user")).one()
    assert user.created_at.tzinfo is None


def test_event_read_keeps_wall_clock_start_date():
    event = EventRead(
        id=1,
        title="t",
        start_date=datetime(2026, 10, 20, 18, 0),
        playground_id=1,
        creator_id=1,
        city="c",
        location="l",
        created_at=NAIVE,
        expected_participants=0,
    )

    data = event.model_dump(mode="json")

    assert data["start_date"] == "2026-10-20T18:00:00"
    assert data["created_at"].endswith("Z")


# ---------------------------------------------------------------------
# Страж: ни одно поле времени в ответах API не может остаться без политики
# ---------------------------------------------------------------------


def _is_policy(metadata) -> bool:
    """Есть ли среди пометок поля UtcDatetime (наш сериализатор) или WallClock."""
    for item in metadata:
        if isinstance(item, WallClock):
            return True

        if getattr(item, "func", None) is serialize_as_utc:
            return True

    return False


def _naive_datetime_fields(annotation, metadata, label, seen) -> list[str]:
    """
    Обходит тип поля (в том числе Optional/List и вложенные модели) и
    возвращает подписи полей datetime, у которых нет ни UtcDatetime, ни
    WallClockDatetime.
    """
    origin = typing.get_origin(annotation)

    if origin is typing.Annotated:
        base, *extra = typing.get_args(annotation)

        return _naive_datetime_fields(base, [*metadata, *extra], label, seen)

    if annotation is datetime:
        return [] if _is_policy(metadata) else [label]

    problems: list[str] = []

    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        if annotation in seen:
            return []

        seen.add(annotation)

        for name, field in annotation.model_fields.items():
            problems += _naive_datetime_fields(
                field.annotation,
                field.metadata,
                f"{annotation.__name__}.{name}",
                seen,
            )

        return problems

    if origin in (typing.Union, types.UnionType, list, dict, tuple, set):
        for arg in typing.get_args(annotation):
            problems += _naive_datetime_fields(arg, metadata, label, seen)

    return problems


def _iter_api_routes(routes):
    """
    Все настоящие маршруты приложения. В этой версии FastAPI
    include_router не раскладывает маршруты в плоский список, а
    кладёт вложенный роутер (original_router), поэтому заходим внутрь.
    """
    for route in routes:
        nested = getattr(route, "original_router", None)

        if nested is not None:
            yield from _iter_api_routes(nested.routes)
            continue

        if isinstance(route, APIRoute):
            yield route
        elif hasattr(route, "routes"):
            yield from _iter_api_routes(route.routes)


def test_no_response_model_exposes_datetime_without_policy():
    """
    Обходит response_model всех маршрутов приложения. Если в новой схеме
    ответа поле объявлено как обычный `datetime`, тест падает со списком
    таких полей: выберите UtcDatetime (время проставляет сервер) или
    WallClockDatetime (время вводит пользователь) — см. app/utc.py.
    """
    seen: set = set()
    problems: list[str] = []
    routes = list(_iter_api_routes(app.routes))

    for route in routes:
        if route.response_model is not None:
            problems += _naive_datetime_fields(
                route.response_model, [], route.path, seen
            )

    # Защита от "зелёного вхолостую": если FastAPI однажды изменит
    # устройство app.routes и обход перестанет находить маршруты, тест
    # должен упасть, а не молча ничего не проверить.
    visited = {model.__name__ for model in seen}

    assert len(routes) > 100, f"найдено маршрутов: {len(routes)}"
    assert len(seen) > 30, f"обойдено моделей: {len(seen)}"
    assert {"ArticleRead", "EventRead", "UserRead", "PlaygroundRead"} <= visited

    assert sorted(set(problems)) == []


def test_guard_detects_a_plain_datetime():
    """Страж не "зелёный по умолчанию": простой datetime он обязан заметить."""

    class Bad(SQLModel):
        created_at: datetime
        nested: typing.Optional[list["Inner"]] = None

    class Inner(SQLModel):
        when: typing.Optional[datetime] = None

    Bad.model_rebuild()

    found = _naive_datetime_fields(Bad, [], "route", set())

    assert sorted(found) == ["Bad.created_at", "Inner.when"]
