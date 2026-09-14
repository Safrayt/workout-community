"""
Тесты на GET /diary/activity-map — карта активности должна учитывать
вообще все тренировки и заметки на площадке, включая скрытые
приватностью (дневник целиком или отдельная запись), но не отдавать
наружу ничего, что позволило бы понять, кто именно там был.
"""

from datetime import date

from sqlmodel import select

from app.models import User
from app.models_diary import DiaryNote, WorkoutEntry
from conftest import auth_headers, register_user

PLAYGROUND_ID = 999  # тут не важна реальная площадка, только id-число


def _hide_diary(session, nickname: str) -> None:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.diary_visible = False
    session.add(user)
    session.commit()


def _create_entry(session, nickname: str, **kwargs) -> None:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    entry = WorkoutEntry(
        date=date.today(),
        title="Тренировка",
        user_id=user.id,
        playground_id=PLAYGROUND_ID,
        **kwargs,
    )
    session.add(entry)
    session.commit()


def _create_note(session, nickname: str, **kwargs) -> None:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    note = DiaryNote(
        text="Заметка",
        user_id=user.id,
        playground_id=PLAYGROUND_ID,
        **kwargs,
    )
    session.add(note)
    session.commit()


def test_activity_map_requires_auth(client):
    response = client.get("/diary/activity-map")

    assert response.status_code == 401


def test_activity_map_counts_entries_from_private_diary(client, session):
    author = register_user(client, nickname="private_author")
    _hide_diary(session, "private_author")
    _create_entry(session, "private_author")

    viewer = register_user(client, nickname="viewer")

    response = client.get(
        "/diary/activity-map", headers=auth_headers(viewer["token"])
    )

    assert response.status_code == 200
    marker = next(
        m for m in response.json() if m["playground_id"] == PLAYGROUND_ID
    )
    assert marker["workout_count"] == 1

    del author  # использован только для регистрации


def test_activity_map_counts_private_records(client, session):
    register_user(client, nickname="author")
    _create_entry(session, "author", is_private=True)
    _create_note(session, "author", is_private=True)

    viewer = register_user(client, nickname="viewer")

    response = client.get(
        "/diary/activity-map", headers=auth_headers(viewer["token"])
    )

    marker = next(
        m for m in response.json() if m["playground_id"] == PLAYGROUND_ID
    )
    assert marker["workout_count"] == 1
    assert marker["note_count"] == 1


def test_activity_map_does_not_leak_identifying_fields(client, session):
    """
    Ответ должен содержать только агрегированные числа и id площадки —
    ни имени/id пользователя, ни заголовка, ни текста записи.
    """
    register_user(client, nickname="author")
    _create_entry(session, "author", is_private=True)

    viewer = register_user(client, nickname="viewer")

    response = client.get(
        "/diary/activity-map", headers=auth_headers(viewer["token"])
    )

    marker = next(
        m for m in response.json() if m["playground_id"] == PLAYGROUND_ID
    )
    assert set(marker.keys()) == {
        "playground_id",
        "workout_count",
        "note_count",
        "last_activity_at",
    }
