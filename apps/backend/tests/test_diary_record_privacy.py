"""
Тесты на hide_from_feed/is_private у WorkoutEntry/DiaryNote —
приватность отдельной записи, отдельно от общей настройки видимости
дневника (User.diary_visible, покрыта в test_diary_admin_visibility.py).
"""

from datetime import date

from sqlmodel import select

from app.models import User
from app.models_diary import DiaryNote, WorkoutEntry
from conftest import auth_headers, register_user


def _make_admin(session, nickname: str) -> None:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.is_admin = True
    session.add(user)
    session.commit()


def _create_entry(session, nickname: str, title: str, **kwargs) -> int:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    entry = WorkoutEntry(date=date.today(), title=title, user_id=user.id, **kwargs)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry.id


def _create_note(session, nickname: str, text: str, **kwargs) -> int:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    note = DiaryNote(text=text, user_id=user.id, **kwargs)
    session.add(note)
    session.commit()
    session.refresh(note)
    return note.id


# --- hide_from_feed: не в общей ленте, но виден на странице дневника -------


def test_hidden_from_feed_entry_is_still_returned_by_backend(client, session):
    """
    hide_from_feed — это разделение по вкладкам "Все записи"/
    "Подписки" ОДНИХ И ТЕХ ЖЕ данных (см. utils/homeFeed.ts на
    фронтенде: обе вкладки используют один и тот же список записей,
    подписки — это просто фильтр по автору поверх него). Бэкенд
    поэтому НЕ должен вырезать такие записи из общего списка — иначе
    вкладка "Подписки" тоже перестала бы их видеть, а по требованию
    она должна их показывать.
    """
    register_user(client, nickname="author")
    _create_entry(
        session, "author", "Скрыто от ленты", hide_from_feed=True
    )

    other = register_user(client, nickname="other")

    response = client.get(
        "/diary/entries", headers=auth_headers(other["token"])
    )

    titles = [e["title"] for e in response.json()]
    assert "Скрыто от ленты" in titles


def test_hidden_from_feed_entry_is_still_visible_on_diary_page(client, session):
    author = register_user(client, nickname="author")
    _create_entry(
        session, "author", "Скрыто от ленты", hide_from_feed=True
    )

    author_db = session.exec(
        select(User).where(User.nickname == "author")
    ).first()

    other = register_user(client, nickname="other")

    response = client.get(
        f"/diary/entries?user_id={author_db.id}",
        headers=auth_headers(other["token"]),
    )

    assert response.status_code == 200
    titles = [e["title"] for e in response.json()]
    assert "Скрыто от ленты" in titles

    del author  # использован только для регистрации


# --- is_private: не видно нигде, кроме автора и админа ---------------------


def test_private_entry_is_excluded_from_general_feed(client, session):
    register_user(client, nickname="author")
    _create_entry(session, "author", "Личная тренировка", is_private=True)

    other = register_user(client, nickname="other")

    response = client.get(
        "/diary/entries", headers=auth_headers(other["token"])
    )

    titles = [e["title"] for e in response.json()]
    assert "Личная тренировка" not in titles


def test_private_entry_is_excluded_from_owner_diary_page_for_others(
    client, session
):
    author = register_user(client, nickname="author")
    entry_id = _create_entry(
        session, "author", "Личная тренировка", is_private=True
    )

    author_db = session.exec(
        select(User).where(User.nickname == "author")
    ).first()

    other = register_user(client, nickname="other")

    list_response = client.get(
        f"/diary/entries?user_id={author_db.id}",
        headers=auth_headers(other["token"]),
    )
    titles = [e["title"] for e in list_response.json()]
    assert "Личная тренировка" not in titles

    direct_response = client.get(
        f"/diary/entries/{entry_id}",
        headers=auth_headers(other["token"]),
    )
    assert direct_response.status_code == 404


def test_private_entry_is_visible_to_its_author(client, session):
    author = register_user(client, nickname="author")
    entry_id = _create_entry(
        session, "author", "Личная тренировка", is_private=True
    )

    author_db = session.exec(
        select(User).where(User.nickname == "author")
    ).first()

    list_response = client.get(
        f"/diary/entries?user_id={author_db.id}",
        headers=auth_headers(author["token"]),
    )
    titles = [e["title"] for e in list_response.json()]
    assert "Личная тренировка" in titles

    direct_response = client.get(
        f"/diary/entries/{entry_id}",
        headers=auth_headers(author["token"]),
    )
    assert direct_response.status_code == 200


def test_private_entry_is_visible_to_admin(client, session):
    register_user(client, nickname="author")
    entry_id = _create_entry(
        session, "author", "Личная тренировка", is_private=True
    )

    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")

    direct_response = client.get(
        f"/diary/entries/{entry_id}",
        headers=auth_headers(admin["token"]),
    )
    assert direct_response.status_code == 200

    admin_feed_response = client.get(
        "/diary/entries?include_hidden=true",
        headers=auth_headers(admin["token"]),
    )
    titles = [e["title"] for e in admin_feed_response.json()]
    assert "Личная тренировка" in titles


def test_private_note_behaves_the_same_as_private_entry(client, session):
    register_user(client, nickname="author")
    note_id = _create_note(session, "author", "Личная заметка", is_private=True)

    author_db = session.exec(
        select(User).where(User.nickname == "author")
    ).first()

    other = register_user(client, nickname="other")

    list_response = client.get(
        f"/diary/notes?user_id={author_db.id}",
        headers=auth_headers(other["token"]),
    )
    texts = [n["text"] for n in list_response.json()]
    assert "Личная заметка" not in texts

    direct_response = client.get(
        f"/diary/notes/{note_id}",
        headers=auth_headers(other["token"]),
    )
    assert direct_response.status_code == 404
