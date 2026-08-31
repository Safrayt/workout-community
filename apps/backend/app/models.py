from datetime import datetime, timezone
from typing import Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel


class UserBase(SQLModel):
    """
    Поля, общие для всех вариантов пользователя:
    и для таблицы в базе, и для данных, которые приходят/уходят по API.
    Вынесены отдельно, чтобы не дублировать одно и то же в трёх местах.

    Ни имени, ни города здесь нет — на портале нигде не используется
    ничего, кроме nickname (см. историю: раньше были name/locality,
    но фронтенд их никогда не показывал, только собирал при
    регистрации и тут же нигде не отображал).
    """

    nickname: str
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

    # Модератор портала: может редактировать/удалять чужие площадки
    # и мероприятия, удалять чужие отзывы (см. app/auth.py,
    # ensure_owner_or_admin). Намеренно нет ни в UserCreate, ни в
    # UserUpdate — этим полем нельзя управлять через API вообще,
    # только напрямую в базе (см. DEPLOY.md, "Как назначить
    # администратора"), чтобы никто не мог назначить себя админом
    # через обычный запрос на регистрацию/обновление профиля.
    is_admin: bool = False


class UserCreate(UserBase):
    """
    Данные, которые ожидаем в теле запроса при регистрации.
    password приходит в открытом виде от клиента (по HTTPS в проде),
    но мы его сразу хешируем и никогда не сохраняем как есть.
    """

    password: str

    @field_validator("nickname")
    @classmethod
    def _validate_nickname(cls, value: str) -> str:
        trimmed = value.strip()

        if len(trimmed) < 2:
            raise ValueError("Nickname должен содержать не менее 2 символов")

        if len(trimmed) > 32:
            raise ValueError("Nickname должен содержать не более 32 символов")

        return trimmed

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Пароль должен содержать не менее 8 символов")

        # bcrypt (см. hash_password в auth.py) физически не может
        # учитывать пароль длиннее 72 байт — если не проверить здесь,
        # при хешировании упадёт с необработанным исключением вместо
        # понятной ошибки 422.
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Пароль слишком длинный (максимум 72 байта)")

        return value


class UserUpdate(SQLModel):
    """
    Все поля необязательны — обновляем только то, что реально
    передано (см. PlaygroundUpdate в models_playground.py — тот же
    подход). Пароль и nickname здесь не меняются: для смены пароля
    и логина в будущем понадобятся отдельные защищённые эндпоинты.
    """

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
    # Можно отдавать клиенту (в отличие от записи через API) — так
    # фронтенд знает, показывать ли этому пользователю кнопки
    # модерации на чужом контенте (см. isAdmin в types/user.ts).
    is_admin: bool
