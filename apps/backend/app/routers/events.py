from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import User
from app.models_event import (
    Event,
    EventCreate,
    EventRead,
    EventRegistration,
    EventRegistrationRead,
    EventUpdate,
    RegistrationStatus,
)
from app.models_playground import Playground

router = APIRouter(prefix="/events", tags=["events"])


def _get_event_or_404(event_id: int, session: Session) -> Event:
    event = session.get(Event, event_id)

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return event


def _ensure_is_owner(event: Event, current_user: User) -> None:
    if event.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Изменять это мероприятие может только его создатель",
        )


def _count_registered_participants(event_id: int, session: Session) -> int:
    """
    Считает количество активных регистраций (не отменённых) на
    мероприятие. Вычисляется по запросу, а не хранится отдельным
    числом — иначе оно могло бы разойтись с реальными регистрациями.
    """
    registrations = session.exec(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.status != RegistrationStatus.cancelled,
        )
    ).all()

    return len(registrations)


def _to_event_read(event: Event, session: Session) -> EventRead:
    return EventRead(
        **event.model_dump(),
        expected_participants=_count_registered_participants(
            event.id, session
        ),
    )


@router.post("/", response_model=EventRead)
def create_event(
    data: EventCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> EventRead:
    """
    Создаёт мероприятие. city/location берутся автоматически из
    площадки — клиент их не передаёт.
    """
    playground = session.get(Playground, data.playground_id)

    if playground is None:
        raise HTTPException(
            status_code=404,
            detail="Указанная площадка не найдена",
        )

    event = Event(
        title=data.title,
        description=data.description,
        start_date=data.start_date,
        poster_url=data.poster_url,
        playground_id=data.playground_id,
        creator_id=current_user.id,
        city=playground.locality,
        location=playground.address,
    )

    session.add(event)
    session.commit()
    session.refresh(event)

    return _to_event_read(event, session)


@router.get("/", response_model=list[EventRead])
def list_events(session: Session = Depends(get_session)) -> list[EventRead]:
    events = session.exec(select(Event)).all()

    return [_to_event_read(event, session) for event in events]


@router.get("/{event_id}", response_model=EventRead)
def get_event(
    event_id: int,
    session: Session = Depends(get_session),
) -> EventRead:
    event = _get_event_or_404(event_id, session)

    return _to_event_read(event, session)


@router.put("/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    data: EventUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> EventRead:
    event = _get_event_or_404(event_id, session)
    _ensure_is_owner(event, current_user)

    updates = data.model_dump(exclude_unset=True)

    for field_name, value in updates.items():
        setattr(event, field_name, value)

    session.add(event)
    session.commit()
    session.refresh(event)

    return _to_event_read(event, session)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    event = _get_event_or_404(event_id, session)
    _ensure_is_owner(event, current_user)

    session.delete(event)
    session.commit()


# --- Регистрация на мероприятие -----------------------------------------

@router.post(
    "/{event_id}/register",
    response_model=EventRegistrationRead,
)
def register_for_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> EventRegistration:
    """
    Записывает текущего пользователя на мероприятие.
    Если раньше он уже отменял участие — регистрация переиспользуется
    (переводится обратно в статус "registered"), а не дублируется.
    """
    _get_event_or_404(event_id, session)

    existing = session.exec(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == current_user.id,
        )
    ).first()

    if existing is not None:
        if existing.status == RegistrationStatus.cancelled:
            existing.status = RegistrationStatus.registered
            session.add(existing)
            session.commit()
            session.refresh(existing)

            return existing

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Вы уже записаны на это мероприятие",
        )

    registration = EventRegistration(
        event_id=event_id,
        user_id=current_user.id,
    )

    session.add(registration)
    session.commit()
    session.refresh(registration)

    return registration


@router.delete(
    "/{event_id}/register",
    status_code=status.HTTP_204_NO_CONTENT,
)
def cancel_registration(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """Отменяет собственную регистрацию на мероприятие."""
    registration = session.exec(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == current_user.id,
        )
    ).first()

    if registration is None:
        raise HTTPException(
            status_code=404,
            detail="Регистрация не найдена",
        )

    registration.status = RegistrationStatus.cancelled

    session.add(registration)
    session.commit()
