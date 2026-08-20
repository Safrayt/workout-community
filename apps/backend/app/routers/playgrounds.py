from datetime import datetime, timezone
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
    PlaygroundHistoryEntry,
    PlaygroundHistoryEntryRead,
    PlaygroundHistoryEntryType,
    PlaygroundPhoto,
    PlaygroundPhotoRead,
    PlaygroundRead,
    PlaygroundUpdate,
)

router = APIRouter(prefix="/playgrounds", tags=["playgrounds"])

# Человекочитаемые названия полей для записи "Изменена" в истории —
# соответствуют строка-в-строку тому, что фронтенд формировал сам
# в utils/playgroundHistory.ts (getChangedFields), чтобы страница
# истории площадки выглядела одинаково независимо от того, кто
# сформировал запись.
CHANGED_FIELD_LABELS = {
    "name": "Название",
    "locality": "Населённый пункт",
    "address": "Адрес",
    "size": "Размер",
    "surface": "Покрытие",
    "access": "Доступ",
    "access_restrictions": "Ограничения доступа",
    "condition": "Состояние",
    "opening_hours": "Время работы",
    "description": "Описание",
}

# Эти поля на фронтенде объединены во вложенные объекты
# (coordinates, amenities) — при изменении любого поля внутри
# такой группы в историю пишется одна общая запись, а не по одной
# на каждое подполе.
COORDINATE_FIELDS = {"latitude", "longitude"}
AMENITY_FIELDS = {
    "lighting", "covered", "changing_room", "toilet", "drinking_water",
    "shower", "parking", "bicycle_parking", "trash_bins", "shade",
}


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


def _to_playground_read(
    playground: Playground,
    session: Session,
) -> PlaygroundRead:
    """
    Собирает PlaygroundRead вручную (а не отдаёт ORM-объект как есть),
    потому что history требует username — а он не хранится в таблице
    PlaygroundHistoryEntry, только user_id (та же идея, что и с
    expected_participants в EventRead: подставляем вычисляемое поле
    на чтении, а не храним дублирующиеся данные в базе).
    """
    history_reads = []

    for entry in sorted(playground.history, key=lambda e: e.date):
        user = session.get(User, entry.user_id)
        history_reads.append(
            PlaygroundHistoryEntryRead(
                id=entry.id,
                type=entry.type,
                date=entry.date,
                user_id=entry.user_id,
                username=user.nickname if user else "?",
                changed_fields=entry.changed_fields,
            )
        )

    return PlaygroundRead(
        **playground.model_dump(),
        photos=playground.photos,
        history=history_reads,
    )


def _add_history_entry(
    playground_id: int,
    user_id: int,
    entry_type: PlaygroundHistoryEntryType,
    session: Session,
    changed_fields: Optional[list[str]] = None,
) -> None:
    session.add(
        PlaygroundHistoryEntry(
            playground_id=playground_id,
            user_id=user_id,
            type=entry_type,
            changed_fields=changed_fields,
        )
    )


def _compute_changed_field_labels(
    playground: Playground,
    updates: dict,
) -> list[str]:
    """
    Сравнивает текущие значения площадки с тем, что реально пришло
    в updates (только затронутые поля — exclude_unset уже применён
    до вызова), и возвращает список подписей на русском для истории.
    Вызывать ДО применения updates к playground.
    """
    labels: list[str] = []
    coordinates_changed = False
    amenities_changed = False

    for field_name, new_value in updates.items():
        old_value = getattr(playground, field_name)

        if old_value == new_value:
            continue

        if field_name in COORDINATE_FIELDS:
            coordinates_changed = True
        elif field_name in AMENITY_FIELDS:
            amenities_changed = True
        elif field_name in CHANGED_FIELD_LABELS:
            labels.append(CHANGED_FIELD_LABELS[field_name])
        elif field_name == "equipment":
            if set(old_value) != set(new_value):
                labels.append("Оборудование")

    if coordinates_changed:
        labels.append("Координаты")

    if amenities_changed:
        labels.append("Удобства")

    return labels


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
        access=data.access,
        access_restrictions=data.access_restrictions,
        condition=data.condition,
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
        trash_bins=data.trash_bins,
        shade=data.shade,
        equipment=data.equipment,
        creator_id=current_user.id,
    )

    session.add(playground)
    session.commit()
    session.refresh(playground)

    # Первая запись в истории площадки — "Добавлена". Делаем отдельным
    # commit'ом после того, как у playground уже точно есть id.
    _add_history_entry(
        playground_id=playground.id,
        user_id=current_user.id,
        entry_type=PlaygroundHistoryEntryType.created,
        session=session,
    )
    session.commit()
    session.refresh(playground)

    return _to_playground_read(playground, session)


@router.get("/", response_model=list[PlaygroundRead])
def list_playgrounds(
    session: Session = Depends(get_session),
) -> list[PlaygroundRead]:
    """Возвращает список всех площадок. Доступно без авторизации."""
    playgrounds = session.exec(select(Playground)).all()

    return [_to_playground_read(pg, session) for pg in playgrounds]


@router.get("/{playground_id}", response_model=PlaygroundRead)
def get_playground(
    playground_id: int,
    session: Session = Depends(get_session),
) -> PlaygroundRead:
    """Возвращает одну площадку по id. Доступно без авторизации."""
    playground = _get_playground_or_404(playground_id, session)

    return _to_playground_read(playground, session)


@router.get(
    "/{playground_id}/history",
    response_model=list[PlaygroundHistoryEntryRead],
)
def get_playground_history(
    playground_id: int,
    session: Session = Depends(get_session),
) -> list[PlaygroundHistoryEntryRead]:
    """
    То же самое, что приходит внутри PlaygroundRead.history — отдельным
    эндпоинтом, на случай если фронтенду понадобится подгружать историю
    без остальных данных площадки (страница /playgrounds/{id}/history).
    """
    playground = _get_playground_or_404(playground_id, session)

    return _to_playground_read(playground, session).history


@router.put("/{playground_id}", response_model=PlaygroundRead)
def update_playground(
    playground_id: int,
    data: PlaygroundUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PlaygroundRead:
    """
    Обновляет площадку. Только создатель площадки может это делать —
    иначе 403 Forbidden. Если реально что-то изменилось, в историю
    площадки добавляется запись "Изменена" со списком полей.
    """
    playground = _get_playground_or_404(playground_id, session)
    _ensure_is_owner(playground, current_user)

    # exclude_unset=True — берём только те поля, которые реально были
    # переданы в запросе, остальные не трогаем.
    updates = data.model_dump(exclude_unset=True)

    # Считаем изменения ДО того, как перезаписали значения — иначе
    # сравнивать будет уже не с чем.
    changed_field_labels = _compute_changed_field_labels(playground, updates)

    for field_name, value in updates.items():
        setattr(playground, field_name, value)

    # Обновляем updated_at при любом реальном изменении — используется
    # на фронтенде для карточки "последнее обновление" и записи в
    # историю площадки.
    playground.updated_at = datetime.now(timezone.utc)

    session.add(playground)

    if changed_field_labels:
        _add_history_entry(
            playground_id=playground_id,
            user_id=current_user.id,
            entry_type=PlaygroundHistoryEntryType.edit,
            session=session,
            changed_fields=changed_field_labels,
        )

    session.commit()
    session.refresh(playground)

    return _to_playground_read(playground, session)


@router.post(
    "/{playground_id}/confirm-inspection",
    response_model=PlaygroundRead,
)
def confirm_playground_inspection(
    playground_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PlaygroundRead:
    """
    Подтверждает, что данные о площадке актуальны ("Всё верно" в
    PlaygroundInspectionPrompt на фронтенде). В отличие от edit/created,
    подтвердить может любой авторизованный пользователь, а не только
    владелец — это и есть смысл проверки силами сообщества.
    """
    playground = _get_playground_or_404(playground_id, session)

    _add_history_entry(
        playground_id=playground_id,
        user_id=current_user.id,
        entry_type=PlaygroundHistoryEntryType.inspection,
        session=session,
    )

    session.commit()
    session.refresh(playground)

    return _to_playground_read(playground, session)


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

    _add_history_entry(
        playground_id=playground_id,
        user_id=current_user.id,
        entry_type=PlaygroundHistoryEntryType.edit,
        session=session,
        changed_fields=["Фотографии"],
    )

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

    _add_history_entry(
        playground_id=playground_id,
        user_id=current_user.id,
        entry_type=PlaygroundHistoryEntryType.edit,
        session=session,
        changed_fields=["Фотографии"],
    )

    session.commit()
