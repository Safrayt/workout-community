"""
Тесты на include_hidden у GET /diary/entries и GET /diary/notes —
вкладка "Администрирование" на Главной: администратор должен видеть
записи вообще всех пользователей, включая тех, кто скрыл дневник
настройками приватности. Проверяем именно на уровне HTTP, а не
доверяем скрытию кнопки на фронтенде — иначе достаточно было бы знать
параметр запроса, чтобы обойти чужую приватность.
"""

from datetime import date

from sqlmodel import select

from app.models import User
from app.models_diary import DiaryNote, WorkoutEntry
from conftest import auth_headers, register_user


def _hide_diary(session, nickname: str) -> None:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.diary_visible = False
    session.add(user)
    session.commit()


def _make_admin(session, nickname: str) -> None:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.is_admin = True
    session.add(user)
    session.commit()


def _create_entry_for(session, nickname: str, title: str) -> None:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    entry = WorkoutEntry(date=date.today(), title=title, user_id=user.id)
    session.add(entry)
    session.commit()


def _create_note_for(session, nickname: str, text: str) -> None:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    note = DiaryNote(text=text, user_id=user.id)
    session.add(note)
    session.commit()


def test_include_hidden_requires_auth(client):
    response = client.get("/diary/entries?include_hidden=true")

    assert response.status_code == 401


def test_include_hidden_forbidden_for_regular_user(client):
    user = register_user(client, nickname="regular")

    response = client.get(
        "/diary/entries?include_hidden=true",
        headers=auth_headers(user["token"]),
    )

    assert response.status_code == 403


def test_admin_sees_hidden_entries_via_include_hidden(client, session):
    author = register_user(client, nickname="private_author")
    _hide_diary(session, "private_author")
    _create_entry_for(session, "private_author", "Скрытая тренировка")

    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")

    # Обычная лента (без include_hidden) скрытую запись не показывает
    # даже администратору — включение полного просмотра явное, не
    # автоматическое для всех, у кого is_admin.
    normal_response = client.get(
        "/diary/entries", headers=auth_headers(admin["token"])
    )
    normal_titles = [e["title"] for e in normal_response.json()]
    assert "Скрытая тренировка" not in normal_titles

    admin_response = client.get(
        "/diary/entries?include_hidden=true",
        headers=auth_headers(admin["token"]),
    )
    assert admin_response.status_code == 200
    admin_titles = [e["title"] for e in admin_response.json()]
    assert "Скрытая тренировка" in admin_titles

    del author  # используется только чтобы зарегистрировать пользователя


def test_admin_sees_hidden_notes_via_include_hidden(client, session):
    register_user(client, nickname="private_author")
    _hide_diary(session, "private_author")
    _create_note_for(session, "private_author", "Скрытая заметка")

    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")

    response = client.get(
        "/diary/notes?include_hidden=true",
        headers=auth_headers(admin["token"]),
    )

    assert response.status_code == 200
    texts = [n["text"] for n in response.json()]
    assert "Скрытая заметка" in texts
