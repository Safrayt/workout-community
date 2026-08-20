from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import get_optional_current_user
from app.database import get_session
from app.models import User
from app.models_achievement import (
    ACHIEVEMENTS,
    Achievement,
    AchievementCondition,
    AchievementProgress,
)
from app.models_event import Event, EventRegistration, RegistrationStatus
from app.models_playground import Playground

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("/", response_model=List[Achievement])
def list_achievements() -> List[Achievement]:
    """Полный каталог достижений — статичный, одинаковый для всех."""
    return ACHIEVEMENTS


@router.get("/progress", response_model=List[AchievementProgress])
def get_achievements_progress(
    user_id: int,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> List[AchievementProgress]:
    """
    Прогресс пользователя по всем достижениям — вычисляется на лету
    из реальных данных (созданные мероприятия/площадки, регистрации,
    посещения), а не хранится отдельно. Копирует
    getAchievementsProgress из utils/achievements.ts: там тоже нет
    отдельного "разблокировано" состояния в базе — всё считается
    заново при каждом открытии страницы.
    """
    owner = session.get(User, user_id)

    if owner is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if not owner.achievements_visible:
        if viewer is None or viewer.id != owner.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Достижения этого пользователя скрыты настройками "
                    "приватности"
                ),
            )

    created_events_count = len(
        session.exec(
            select(Event).where(Event.creator_id == user_id)
        ).all()
    )

    created_playgrounds_count = len(
        session.exec(
            select(Playground).where(Playground.creator_id == user_id)
        ).all()
    )

    user_registrations = session.exec(
        select(EventRegistration).where(
            EventRegistration.user_id == user_id
        )
    ).all()

    attended_events_count = len(
        [
            r
            for r in user_registrations
            if r.status == RegistrationStatus.attended
        ]
    )

    statistics = {
        AchievementCondition.created_events: created_events_count,
        AchievementCondition.created_playgrounds: created_playgrounds_count,
        AchievementCondition.registrations: len(user_registrations),
        AchievementCondition.attended_events: attended_events_count,
    }

    return [
        AchievementProgress(
            achievement=achievement,
            progress=statistics[achievement.condition],
            unlocked=statistics[achievement.condition] >= achievement.target,
        )
        for achievement in ACHIEVEMENTS
    ]
