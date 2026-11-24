from collections import Counter
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
from app.models_diary import WorkoutEntry
from app.models_event import Event, EventRegistration, RegistrationStatus
from app.models_playground import Playground

router = APIRouter(prefix="/achievements", tags=["achievements"])

# Пороги температуры для достижений «Айс!» и «Отморозки в поиске
# свежести»: засчитывается запись при этой температуре и холоднее.
MINUS_10_C = -10
MINUS_20_C = -20


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
    посещения, записи дневника), а не хранится отдельно: отдельного
    "разблокировано" состояния в базе нет, всё считается заново при
    каждом открытии страницы. Фронтенд берёт прогресс именно отсюда —
    записи дневника другого человека на клиенте недоступны.
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

    # Берём только нужные колонки, а не целые записи: фото и описания
    # для подсчёта не нужны. Считаются все записи автора, включая
    # скрытые приватностью, — это его собственные тренировки, а то,
    # кто видит достижения, решает achievements_visible (проверено выше).
    entry_rows = session.exec(
        select(
            WorkoutEntry.playground_id,
            WorkoutEntry.program_id,
            WorkoutEntry.temperature_c,
        ).where(WorkoutEntry.user_id == user_id)
    ).all()

    workouts_at_minus_10 = len(
        [
            1
            for _, _, temperature in entry_rows
            if temperature is not None and temperature <= MINUS_10_C
        ]
    )
    workouts_at_minus_20 = len(
        [
            1
            for _, _, temperature in entry_rows
            if temperature is not None and temperature <= MINUS_20_C
        ]
    )
    workouts_with_program = len(
        [1 for _, program_id, _ in entry_rows if program_id is not None]
    )

    entries_per_playground = Counter(
        playground_id
        for playground_id, _, _ in entry_rows
        if playground_id is not None
    )
    workouts_on_one_playground = max(entries_per_playground.values(), default=0)

    statistics = {
        AchievementCondition.created_events: created_events_count,
        AchievementCondition.created_playgrounds: created_playgrounds_count,
        AchievementCondition.registrations: len(user_registrations),
        AchievementCondition.attended_events: attended_events_count,
        AchievementCondition.workouts_at_minus_10: workouts_at_minus_10,
        AchievementCondition.workouts_at_minus_20: workouts_at_minus_20,
        AchievementCondition.workouts_with_program: workouts_with_program,
        AchievementCondition.workouts_on_one_playground: (
            workouts_on_one_playground
        ),
    }

    return [
        AchievementProgress(
            achievement=achievement,
            progress=statistics[achievement.condition],
            unlocked=statistics[achievement.condition] >= achievement.target,
        )
        for achievement in ACHIEVEMENTS
    ]
