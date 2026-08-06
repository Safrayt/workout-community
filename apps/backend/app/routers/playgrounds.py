from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.files import delete_image, save_image
from app.models import User
from app.models_playground import (
    Playground,
    PlaygroundCreate,
    PlaygroundPhoto,
    PlaygroundPhotoRead,
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


@router.post(
    "/{playground_id}/photos",
    response_model=PlaygroundPhotoRead,
)
async def add_playground_photo(
    playground_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    is_main: bool = Form(False),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PlaygroundPhoto:
    """
    Загружает файл-изображение и привязывает его к площадке как фото.
    Только владелец площадки может добавлять фото.
    Если is_main=true, у остальных фото этой площадки снимаем отметку
    "главное" — она может быть только у одной фотографии одновременно.
    """
    playground = _get_playground_or_404(playground_id, session)
    _ensure_is_owner(playground, current_user)

    url = await save_image(file, "playgrounds")

    if is_main:
        for existing_photo in playground.photos:
            if existing_photo.is_main:
                existing_photo.is_main = False
                session.add(existing_photo)

    photo = PlaygroundPhoto(
        playground_id=playground_id,
        url=url,
        description=description,
        is_main=is_main,
    )

    session.add(photo)
    session.commit()
    session.refresh(photo)

    return photo


@router.delete(
    "/{playground_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_playground_photo(
    playground_id: int,
    photo_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Удаляет фото площадки — и запись в базе, и сам файл с диска."""
    playground = _get_playground_or_404(playground_id, session)
    _ensure_is_owner(playground, current_user)

    photo = session.get(PlaygroundPhoto, photo_id)

    if photo is None or photo.playground_id != playground_id:
        raise HTTPException(status_code=404, detail="Photo not found")

    delete_image(photo.url)

    session.delete(photo)
    session.commit()
