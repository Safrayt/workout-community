import enum
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


# --- Мероприятие -------------------------------------------------------

class EventBase(SQLModel):
    title: str
    description: str = ""
    start_date: datetime
    poster_url: Optional[str] = None


class Event(EventBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    playground_id: int = Field(foreign_key="playground.id")
    creator_id: int = Field(foreign_key="user.id")

    # Заполняются сервером из площадки при создании мероприятия
    # (клиент их не присылает — их нет в EventCreate).
    city: str
    location: str

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class EventCreate(EventBase):
    playground_id: int


class EventUpdate(SQLModel):
    """Все поля необязательны — обновляем только то, что передано."""

    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    poster_url: Optional[str] = None


class EventRead(EventBase):
    id: int
    playground_id: int
    creator_id: int
    city: str
    location: str
    created_at: datetime

    # Не хранится в базе, а вычисляется на лету по таблице регистраций —
    # см. _count_registered_participants в routers/events.py.
    expected_participants: int


# --- Регистрация на мероприятие -----------------------------------------

class RegistrationStatus(str, enum.Enum):
    registered = "registered"
    cancelled = "cancelled"
    attended = "attended"


class EventRegistrationBase(SQLModel):
    status: RegistrationStatus = RegistrationStatus.registered
    experience_awarded: int = 0


class EventRegistration(EventRegistrationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id")
    event_id: int = Field(foreign_key="event.id")

    registered_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class EventRegistrationRead(EventRegistrationBase):
    id: int
    user_id: int
    event_id: int
    registered_at: datetime
