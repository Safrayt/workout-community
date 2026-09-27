from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.auth import ensure_owner_or_admin, get_current_user
from app.database import get_session
from app.files import delete_image, save_image
from app.models import User
from app.models_event import (
    Event,
    EventComment,
    EventCommentCreate,
    EventCommentRead,
    EventCommentUpdate,
    EventCreate,
    EventRead,
    EventRegistration,
    EventRegistrationRead,
    EventUpdate,
    RegistrationStatus,
)
from app.models_notification import NotificationType
from app.models_playground import Playground
from app.notifications import notify_mentions, notify_new_comment

router = APIRouter(prefix="/events", tags=["events"])


def _get_event_or_404(event_id: int, session: Session) -> Event:
    event = session.get(Event, event_id)

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return event


def _ensure_is_owner(event: Event, current_user: User) -> None:
    # Администратору можно всегда — см. ensure_owner_or_admin в app/auth.py.
    ensure_owner_or_admin(
        event.creator_id,
        current_user,
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


@router.get(
    "/registrations",
    response_model=list[EventRegistrationRead],
)
def list_all_registrations(
    session: Session = Depends(get_session),
) -> list[EventRegistration]:
    """
    Полный список регистраций по всем мероприятиям и пользователям —
    без фильтров. Публичный эндпоинт: как и data/registrations.ts на
    фронтенде, это не приватные данные (нет соответствующей настройки
    в PrivacySettings), а нужен он сразу многим разным страницам
    (MyEvents, PastEvents, UserEvents, Achievements, счётчики
    участников на карточках) — поэтому проще отдать всё целиком и
    отфильтровать на клиенте, чем городить кучу узких query-параметров.

    Объявлен ДО @router.get("/{event_id}") намеренно: раз оба пути
    содержат один сегмент после /events/, порядок регистрации
    маршрутов в FastAPI решает, что "/events/registrations" не
    пытается сматчиться как {event_id}="registrations" (иначе
    получили бы 422 — event_id не приводится к int).
    """
    return list(session.exec(select(EventRegistration)).all())


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
    """
    В отличие от Playground (см. delete_playground в
    routers/playgrounds.py), мероприятие никак не блокирует удаление
    из-за наличия регистраций — участие в мероприятии не обязано
    "переживать" отмену самого мероприятия. Но регистрации при этом
    нужно удалить явно ДО удаления события: между Event и
    EventRegistration нет ORM-связи с cascade (только обычные
    foreign_key-поля), а PostgreSQL (в отличие от SQLite по
    умолчанию) реально проверяет внешние ключи — без этой явной
    очистки удаление мероприятия с хотя бы одним зарегистрированным
    участником падало бы с ошибкой нарушения внешнего ключа.
    """
    event = _get_event_or_404(event_id, session)
    _ensure_is_owner(event, current_user)

    registrations = session.exec(
        select(EventRegistration).where(
            EventRegistration.event_id == event_id
        )
    ).all()
    for registration in registrations:
        session.delete(registration)

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


# --- Афиша мероприятия ---------------------------------------------------

@router.post("/{event_id}/poster", response_model=EventRead)
async def upload_event_poster(
    event_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> EventRead:
    """
    Загружает афишу мероприятия. Если афиша уже была, старый файл
    удаляется с диска, чтобы не копились неиспользуемые файлы.
    """
    event = _get_event_or_404(event_id, session)
    _ensure_is_owner(event, current_user)

    delete_image(event.poster_url)
    event.poster_url = await save_image(file, "events")

    session.add(event)
    session.commit()
    session.refresh(event)

    return _to_event_read(event, session)


@router.delete("/{event_id}/poster", response_model=EventRead)
def delete_event_poster(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> EventRead:
    """Убирает афишу мероприятия (после этого EventCard покажет фото площадки)."""
    event = _get_event_or_404(event_id, session)
    _ensure_is_owner(event, current_user)

    delete_image(event.poster_url)
    event.poster_url = None

    session.add(event)
    session.commit()
    session.refresh(event)

    return _to_event_read(event, session)


# --- Комментарии к мероприятию -------------------------------------------

COMMENT_MAX_LENGTH = 500


def _validate_comment_text(text: str) -> str:
    trimmed = text.strip()

    if not trimmed:
        raise HTTPException(status_code=400, detail="Комментарий не может быть пустым.")

    if len(trimmed) > COMMENT_MAX_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Комментарий не должен превышать {COMMENT_MAX_LENGTH} символов.",
        )

    return trimmed


def _get_event_comment_or_404(comment_id: int, session: Session) -> EventComment:
    comment = session.get(EventComment, comment_id)

    if comment is None:
        raise HTTPException(status_code=404, detail="Комментарий не найден")

    return comment


def _notify_about_event_comment(
    event: Event, actor: User, comment_text: str, session: Session
) -> None:
    """
    Уведомляет о новом комментарии создателя мероприятия и всех, кто
    зарегистрирован на участие (включая уже отмеченных как
    "посетил"), кроме самого автора комментария. Плюс отдельно —
    любых @Ник, упомянутых в тексте, даже если они не участвуют в
    мероприятии вовсе.
    """
    target_url = f"/events/{event.id}"

    participant_ids = session.exec(
        select(EventRegistration.user_id).where(
            EventRegistration.event_id == event.id,
            EventRegistration.status != RegistrationStatus.cancelled,
        )
    ).all()

    recipient_ids = {event.creator_id, *participant_ids}

    notify_new_comment(
        session,
        recipient_ids=recipient_ids,
        actor=actor,
        type=NotificationType.event_comment,
        target_url=target_url,
        target_title=event.title,
    )

    notify_mentions(
        session,
        text=comment_text,
        actor=actor,
        target_url=target_url,
        target_title=event.title,
    )


@router.get("/{event_id}/comments", response_model=List[EventCommentRead])
def list_event_comments(
    event_id: int,
    session: Session = Depends(get_session),
) -> List[EventComment]:
    _get_event_or_404(event_id, session)

    return session.exec(
        select(EventComment)
        .where(EventComment.event_id == event_id)
        .order_by(EventComment.created_at)
    ).all()


@router.post("/{event_id}/comments", response_model=EventCommentRead)
def create_event_comment(
    event_id: int,
    data: EventCommentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> EventComment:
    event = _get_event_or_404(event_id, session)

    text = _validate_comment_text(data.text)

    comment = EventComment(
        event_id=event_id,
        user_id=current_user.id,
        text=text,
    )

    session.add(comment)

    _notify_about_event_comment(event, current_user, text, session)

    session.commit()
    session.refresh(comment)

    return comment


@router.put("/comments/{comment_id}", response_model=EventCommentRead)
def update_event_comment(
    comment_id: int,
    data: EventCommentUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> EventComment:
    comment = _get_event_comment_or_404(comment_id, session)

    ensure_owner_or_admin(
        comment.user_id,
        current_user,
        detail="Редактировать этот комментарий может только его автор",
    )

    comment.text = _validate_comment_text(data.text)

    session.add(comment)
    session.commit()
    session.refresh(comment)

    return comment


@router.delete("/comments/{comment_id}", status_code=204)
def delete_event_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    comment = _get_event_comment_or_404(comment_id, session)

    ensure_owner_or_admin(
        comment.user_id,
        current_user,
        detail="Удалить этот комментарий может только его автор или администратор",
    )

    session.delete(comment)
    session.commit()
