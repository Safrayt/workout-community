"""
Типы для времени в ответах API.

В базе (SQLite и PostgreSQL) время хранится в UTC, но без указания
пояса: колонки DateTime — "наивные". Pydantic отдаёт такое время в
JSON без суффикса ("2026-10-16T06:28:58"), и браузер читает строку без
пояса как МЕСТНОЕ время — в Белграде новая запись выглядела как
созданная два часа назад, а для читателей западнее UTC — как созданная
в будущем.

UtcDatetime исправляет это при выводе: перед сериализацией в JSON
дописывает UTC ("2026-10-16T06:28:58Z"). Само значение в Python не
меняется (остаётся "наивным", как в базе), поэтому сравнения вроде
`created_at > marker.last_activity_at` в роутерах работают как раньше.

Какой тип выбрать для нового поля в схеме ответа (Read-модели):
  - время, которое проставляет сервер (создано, изменено, опубликовано,
    зарегистрирован) -> UtcDatetime;
  - время, которое пользователь вводит как местное (начало
    мероприятия: "18:00" на площадке) -> WallClockDatetime. Оно
    намеренно хранится и отдаётся без пояса, и приписывать ему UTC
    нельзя — время на странице мероприятия сдвинулось бы.
Простой `datetime` в схемах ответов запрещён: это проверяет
tests/test_utc_datetimes.py.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer


def serialize_as_utc(value: datetime) -> datetime:
    """Помечает "наивное" время как UTC; время с поясом переводит в UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


UtcDatetime = Annotated[
    datetime,
    PlainSerializer(serialize_as_utc, return_type=datetime, when_used="json"),
]


@dataclass(frozen=True)
class WallClock:
    """Пометка "время без пояса задумано" — ничего не делает, только документирует и проверяется тестом."""


WallClockDatetime = Annotated[datetime, WallClock()]
