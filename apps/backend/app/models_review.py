from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class PlaygroundReviewBase(SQLModel):
    text: str


class PlaygroundReview(PlaygroundReviewBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    playground_id: int = Field(foreign_key="playground.id")
    user_id: int = Field(foreign_key="user.id")

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class PlaygroundReviewCreate(PlaygroundReviewBase):
    playground_id: int


class PlaygroundReviewUpdate(SQLModel):
    text: str


class PlaygroundReviewRead(PlaygroundReviewBase):
    id: int
    playground_id: int
    user_id: int
    created_at: datetime
