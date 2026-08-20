from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


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
    created_at: datetime


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
    created_at: datetime
