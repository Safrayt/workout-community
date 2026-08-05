from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class UserBase(SQLModel):
    """
    Поля, общие для всех вариантов пользователя:
    и для таблицы в базе, и для данных, которые приходят/уходят по API.
    Вынесены отдельно, чтобы не дублировать одно и то же в трёх местах.
    """

    name: str
    nickname: str
    locality: str
    bio: str = ""
    avatar_url: Optional[str] = None


class User(UserBase, table=True):
    """
    Настоящая таблица в базе данных (table=True).
    password_hash хранит только хеш пароля, никогда не сам пароль.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    password_hash: str
    experience: int = 0
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class UserCreate(UserBase):
    """
    Данные, которые ожидаем в теле запроса при регистрации.
    password приходит в открытом виде от клиента (по HTTPS в проде),
    но мы его сразу хешируем и никогда не сохраняем как есть.
    """

    password: str


class UserRead(UserBase):
    """
    Данные, которые отдаём клиенту в ответ.
    Обратите внимание: password_hash сюда намеренно не включён —
    он никогда не должен попадать в ответ API.
    """

    id: int
    experience: int
    created_at: datetime
