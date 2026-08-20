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

    # SocialLinks с фронтенда (types/socialLinks.ts) — вложенный объект,
    # "распрямляем" в отдельные колонки по той же схеме, что и
    # PlaygroundAmenities в models_playground.py.
    social_telegram: Optional[str] = None
    social_vk: Optional[str] = None
    social_whatsapp: Optional[str] = None
    social_signal: Optional[str] = None
    social_instagram: Optional[str] = None
    social_youtube: Optional[str] = None
    social_github: Optional[str] = None
    social_website: Optional[str] = None

    # PrivacySettings с фронтенда (types/privacySettings.ts) — тоже
    # вложенный объект, аналогично распрямляем. Значения по умолчанию
    # совпадают с DEFAULT_PRIVACY_SETTINGS на фронте — всё видно всем.
    diary_visible: bool = True
    achievements_visible: bool = True
    events_visible: bool = True
    subscriptions_visible: bool = True


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


class UserUpdate(SQLModel):
    """
    Все поля необязательны — обновляем только то, что реально
    передано (см. PlaygroundUpdate в models_playground.py — тот же
    подход). Пароль и nickname здесь не меняются: для смены пароля
    и логина в будущем понадобятся отдельные защищённые эндпоинты.
    """

    name: Optional[str] = None
    locality: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

    social_telegram: Optional[str] = None
    social_vk: Optional[str] = None
    social_whatsapp: Optional[str] = None
    social_signal: Optional[str] = None
    social_instagram: Optional[str] = None
    social_youtube: Optional[str] = None
    social_github: Optional[str] = None
    social_website: Optional[str] = None

    diary_visible: Optional[bool] = None
    achievements_visible: Optional[bool] = None
    events_visible: Optional[bool] = None
    subscriptions_visible: Optional[bool] = None


class UserRead(UserBase):
    """
    Данные, которые отдаём клиенту в ответ.
    Обратите внимание: password_hash сюда намеренно не включён —
    он никогда не должен попадать в ответ API.
    """

    id: int
    experience: int
    created_at: datetime
