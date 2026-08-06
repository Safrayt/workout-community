from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.models_playground import (
    Playground,
    PlaygroundCreate,
    PlaygroundPhoto,
    PlaygroundRead,
    PlaygroundUpdate,
)

router = APIRouter(prefix="/playgrounds", tags=["playgrounds"])


def _get_playground_or_404(
    playground_id: int,
    session: Session,
) -> Playground:
    playground = session.get(Playground, playground_id)

    if playground is None:
        raise HTTPException(status_code=404, detail="Playground not found")

    return playground


def _ensure_is_owner(playground: Playground, current_user: User) -> None:
    if playground.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Редактировать эту площадку может только её создатель",
        )


@router.post("/", response_model=PlaygroundRead)
def create_playground(
    data: PlaygroundCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Playground:
    """
    Создаёт площадку. Требует авторизации — creator_id берётся
    из токена, а не из тела запроса, чтобы нельзя было создать
    площадку "от имени" другого пользователя.
    """
    playground = Playground(
        name=data.name,
        locality=data.locality,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        size=data.size,
        surface=data.surface,
        opening_hours=data.opening_hours,
        description=data.description,
        lighting=data.lighting,
        covered=data.covered,
        changing_room=data.changing_room,
        toilet=data.toilet,
        drinking_water=data.drinking_water,
        shower=data.shower,
        parking=data.parking,
        bicycle_parking=data.bicycle_parking,
        equipment=data.equipment,
        creator_id=current_user.id,
    )

    # Фотографии создаём отдельными записями, связанными с площадкой.
    for photo_data in data.photos:
        playground.photos.append(
            PlaygroundPhoto(
                url=photo_data.url,
                description=photo_data.description,
                is_main=photo_data.is_main,
            )
        )

    session.add(playground)
    session.commit()
    session.refresh(playground)

    return playground


@router.get("/", response_model=list[PlaygroundRead])
def list_playgrounds(
    session: Session = Depends(get_session),
) -> list[Playground]:
    """Возвращает список всех площадок. Доступно без авторизации."""
    playgrounds = session.exec(select(Playground)).all()

    return list(playgrounds)


@router.get("/{playground_id}", response_model=PlaygroundRead)
def get_playground(
    playground_id: int,
    session: Session = Depends(get_session),
) -> Playground:
    """Возвращает одну площадку по id. Доступно без авторизации."""
    return _get_playground_or_404(playground_id, session)


@router.put("/{playground_id}", response_model=PlaygroundRead)
def update_playground(
    playground_id: int,
    data: PlaygroundUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Playground:
    """
    Обновляет площадку. Только создатель площадки может это делать —
    иначе 403 Forbidden.
    """
    playground = _get_playground_or_404(playground_id, session)
    _ensure_is_owner(playground, current_user)

    # exclude_unset=True — берём только те поля, которые реально были
    # переданы в запросе, остальные не трогаем.
    updates = data.model_dump(exclude_unset=True)

    for field_name, value in updates.items():
        setattr(playground, field_name, value)

    session.add(playground)
    session.commit()
    session.refresh(playground)

    return playground


@router.delete("/{playground_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_playground(
    playground_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """
    Удаляет площадку. Только создатель площадки может это делать —
    иначе 403 Forbidden.
    """
    playground = _get_playground_or_404(playground_id, session)
    _ensure_is_owner(playground, current_user)

    session.delete(playground)
    session.commit()
