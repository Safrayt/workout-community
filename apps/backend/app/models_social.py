import enum
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel

from app.utc import UtcDatetime


class Subscription(SQLModel, table=True):
    """
    follower_id подписан на following_id. Уникальность пары и запрет
    self-follow проверяются в коде роутера (routers/social.py), а не
    ограничением базы — так же, как и остальные бизнес-правила в этом
    проекте (см. проверку дублей тегов в routers/diary.py).
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    follower_id: int = Field(foreign_key="user.id")
    following_id: int = Field(foreign_key="user.id")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class SubscriptionRead(SQLModel):
    id: int
    follower_id: int
    following_id: int
    created_at: UtcDatetime


class PlaygroundFavorite(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    playground_id: int = Field(foreign_key="playground.id")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class PlaygroundFavoriteRead(SQLModel):
    id: int
    user_id: int
    playground_id: int
    created_at: UtcDatetime


class CommentKind(str, enum.Enum):
    """Где оставлен комментарий: у каждого вида — своя таблица."""

    diary = "diary"  # комментарии к записям и заметкам дневника (Comment)
    event = "event"  # к мероприятиям (EventComment)
    program = "program"  # к программам (ProgramComment)
    complex = "complex"  # к комплексам (ComplexComment)


class CommentLike(SQLModel, table=True):
    """
    Лайк пользователя на комментарии. Комментарии лежат в четырёх разных
    таблицах, поэтому лайк ссылается на комментарий парой (kind,
    comment_id), а не внешним ключом. Уникальность (kind, comment_id,
    user_id) проверяется в коде роутера (routers/comment_likes.py), как и
    остальные бизнес-правила в этом проекте.

    comment_created_at — время создания комментария на момент лайка. Лайк
    засчитывается, только пока комментарий с таким id существует и создан
    в то же время: так лайки удалённого комментария не «переходят» новому,
    которому база (SQLite) могла отдать освободившийся id, и при удалении
    комментариев и записей не нужно отдельно чистить лайки.
    """

    id: Optional[int] = Field(default=None, primary_key=True)

    kind: CommentKind = Field(index=True)
    comment_id: int = Field(index=True)
    user_id: int = Field(foreign_key="user.id")

    comment_created_at: datetime

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class CommentLikeSummary(SQLModel):
    """Сколько лайков у комментария и поставил ли его текущий пользователь."""

    comment_id: int
    count: int
    liked_by_me: bool
