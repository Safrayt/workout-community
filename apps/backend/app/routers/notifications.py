from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.models_notification import (
    Notification,
    NotificationRead,
    NotificationType,
    UnreadNotificationCount,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Отдаём одним списком, без серверной пагинации — на фронтенде список
# листается постранично уже на клиенте (как и в остальном проекте, см.
# utils/pagination.ts и его использование в Diary.tsx/UserDiary.tsx).
# Отдавать буквально ВСЁ, что когда-либо накопилось, всё же не стоит —
# ограничиваем разумным запасом на будущее.
MAX_NOTIFICATIONS_RETURNED = 500


@router.get("/", response_model=List[NotificationRead])
def list_notifications(
    type: Optional[NotificationType] = Query(
        default=None,
        description="Фильтр по типу уведомления (см. NotificationType).",
    ),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[Notification]:
    query = select(Notification).where(
        Notification.user_id == current_user.id
    )

    if type is not None:
        query = query.where(Notification.type == type)

    query = query.order_by(Notification.created_at.desc()).limit(
        MAX_NOTIFICATIONS_RETURNED
    )

    return session.exec(query).all()


@router.get("/unread-count", response_model=UnreadNotificationCount)
def get_unread_notification_count(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> UnreadNotificationCount:
    notifications = session.exec(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712 (SQLAlchemy-стиль сравнения)
        )
    ).all()

    return UnreadNotificationCount(count=len(notifications))


@router.post("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Notification:
    notification = session.get(Notification, notification_id)

    if notification is None:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")

    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Это уведомление адресовано не вам",
        )

    if not notification.is_read:
        notification.is_read = True
        session.add(notification)
        session.commit()
        session.refresh(notification)

    return notification


@router.post("/read-all", status_code=204)
def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    unread = session.exec(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
    ).all()

    for notification in unread:
        notification.is_read = True
        session.add(notification)

    session.commit()
