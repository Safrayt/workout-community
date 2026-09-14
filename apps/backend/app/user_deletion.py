"""
Общая логика полного удаления пользователя — используется и
скриптом delete_user.py (консоль), и DELETE /users/{user_id} (раздел
"Пользователи" в админ-панели на сайте, см. routers/users.py), чтобы
не дублировать её в двух местах и не разойтись в будущем.

Переиспользует те же функции, что вызывает сам сайт (delete_playground,
delete_event, delete_workout_entry, delete_diary_note — обычные
функции из routers/, вызываются здесь напрямую в обход HTTP/FastAPI),
чтобы не дублировать их логику (удаление файлов фото с диска, очистка
комментариев и т.п.).
"""

from typing import List

from sqlmodel import Session, select

from app.models import User
from app.models_complex import ComplexCompletion
from app.models_diary import Comment, DiaryNote, PersonalTag, WorkoutEntry
from app.models_event import Event, EventRegistration
from app.models_playground import Playground
from app.models_review import PlaygroundReview
from app.models_social import PlaygroundFavorite, Subscription
from app.routers.diary import delete_diary_note, delete_workout_entry
from app.routers.events import delete_event
from app.routers.playgrounds import delete_playground


class UserHasOwnedContentError(Exception):
    """
    У пользователя есть свои площадки/мероприятия — это общий
    контент сообщества, а не личные данные, поэтому решение, что с
    ним делать, должно быть осознанным (см. with_owned_content у
    delete_user_completely). Вызывающий код сам решает, как это
    показать — консольным списком (delete_user.py) или 400-й ошибкой
    с понятным detail (routers/users.py).
    """

    def __init__(self, playgrounds: List[Playground], events: List[Event]):
        self.playgrounds = playgrounds
        self.events = events
        super().__init__("User has owned playgrounds/events")


def delete_user_completely(
    target: User,
    session: Session,
    with_owned_content: bool = False,
) -> None:
    """
    Удаляет пользователя вместе со всеми его личными данными.

    Если у пользователя есть СВОИ площадки или мероприятия и
    with_owned_content=False — ничего не удаляет и поднимает
    UserHasOwnedContentError, чтобы вызывающий код мог решить, что
    делать (см. класс выше). При with_owned_content=True удаляет
    вместе с пользователем и этот контент — необратимо.

    Может поднять HTTPException (из delete_playground) — площадку
    нельзя удалить, пока на неё ссылается мероприятие ДРУГОГО
    пользователя (свои мы уже удалили до этого шага). В этом случае
    ничего не коммитится; вызывающий код должен сам сделать
    session.rollback() при необходимости.
    """
    owned_playgrounds = session.exec(
        select(Playground).where(Playground.creator_id == target.id)
    ).all()
    owned_events = session.exec(
        select(Event).where(Event.creator_id == target.id)
    ).all()

    if (owned_playgrounds or owned_events) and not with_owned_content:
        raise UserHasOwnedContentError(
            list(owned_playgrounds), list(owned_events)
        )

    # 1. Мероприятия, созданные пользователем — раньше площадок,
    #    которые он создал: площадку нельзя удалить, пока на неё
    #    ссылается хоть одно мероприятие (см. delete_playground), а
    #    её собственные мероприятия как раз мешают этому.
    for event in owned_events:
        delete_event(event.id, current_user=target, session=session)

    # 2. Записи дневника и заметки — до выполнений комплексов:
    #    delete_workout_entry сам решает, что делать со связанными
    #    выполнениями (отвязывает, не удаляет — см. models_complex),
    #    поэтому после этого шага их можно спокойно удалить.
    entries = session.exec(
        select(WorkoutEntry).where(WorkoutEntry.user_id == target.id)
    ).all()
    for entry in entries:
        delete_workout_entry(entry.id, current_user=target, session=session)

    notes = session.exec(
        select(DiaryNote).where(DiaryNote.user_id == target.id)
    ).all()
    for note in notes:
        delete_diary_note(note.id, current_user=target, session=session)

    # 3. Площадки, созданные пользователем. Может поднять
    #    HTTPException, если на площадку всё ещё ссылается чьё-то
    #    ЧУЖОЕ мероприятие (свои мы уже удалили выше) — сознательно
    #    не ловим здесь, пусть решает вызывающий код.
    for playground in owned_playgrounds:
        delete_playground(playground.id, current_user=target, session=session)

    # 4. Всё остальное — личные данные без сложных побочных
    #    эффектов (файлов на диске у них нет), поэтому просто
    #    удаляем строки напрямую.
    def _delete_all(model, column) -> None:
        rows = session.exec(select(model).where(column == target.id)).all()
        for row in rows:
            session.delete(row)

    _delete_all(ComplexCompletion, ComplexCompletion.user_id)
    _delete_all(EventRegistration, EventRegistration.user_id)
    _delete_all(PlaygroundFavorite, PlaygroundFavorite.user_id)
    _delete_all(PlaygroundReview, PlaygroundReview.user_id)
    _delete_all(Comment, Comment.user_id)
    _delete_all(PersonalTag, PersonalTag.user_id)

    following = session.exec(
        select(Subscription).where(Subscription.follower_id == target.id)
    ).all()
    followers = session.exec(
        select(Subscription).where(Subscription.following_id == target.id)
    ).all()
    for subscription in [*following, *followers]:
        session.delete(subscription)

    # 5. И сам пользователь.
    session.delete(target)
    session.commit()
