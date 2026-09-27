import enum
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class NotificationType(str, enum.Enum):
    """
    Соответствует фильтрам на странице уведомлений: "Дневник",
    "Площадки", "События", "Упоминания".
    """

    diary_comment = "diary_comment"
    playground_comment = "playground_comment"
    event_comment = "event_comment"
    mention = "mention"


class NotificationBase(SQLModel):
    type: NotificationType

    # Относительный путь на фронтенде, куда ведёт уведомление —
    # например "/diary/42", "/playgrounds/7", "/events/3". Строится
    # один раз при создании уведомления (см. app/notifications.py), а
    # не заново на фронтенде — так фронтенду не нужно дублировать
    # знание о том, какой тип уведомления на какой маршрут ведёт.
    target_url: str

    # Название того, что затронуло уведомление (заголовок события,
    # название площадки, название/заголовок записи дневника) — чтобы
    # текст уведомления был содержательным ("...на странице события
    # «Утренняя пробежка»"), а не голой ссылкой. Может быть пустым
    # (например, у записи дневника без названия).
    target_title: Optional[str] = None

    is_read: bool = False


class Notification(NotificationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # Получатель уведомления.
    user_id: int = Field(foreign_key="user.id")

    # Кто вызвал уведомление (оставил комментарий/отметил). Фронтенд
    # сейчас его не показывает (тексты вида "На странице X добавился
    # новый комментарий" не называют автора комментария по ТЗ), но
    # хранить полезно на будущее и для отладки.
    actor_id: int = Field(foreign_key="user.id")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class NotificationRead(NotificationBase):
    id: int
    user_id: int
    actor_id: int
    created_at: datetime


class UnreadNotificationCount(SQLModel):
    count: int
