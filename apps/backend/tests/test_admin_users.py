"""
Тесты на новые admin-эндпоинты в routers/users.py — раздел
"Пользователи" в админ-панели: удаление пользователя и ограничение
показа его публикаций в общей ленте.
"""

from datetime import date

from sqlmodel import select

from app.models import User
from app.models_diary import WorkoutEntry
from conftest import auth_headers, register_user


def _make_admin(session, nickname: str) -> None:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.is_admin = True
    session.add(user)
    session.commit()


def _get_user_id(session, nickname: str) -> int:
    return session.exec(
        select(User).where(User.nickname == nickname)
    ).first().id


# --- Ограничение показа в ленте --------------------------------------------


def test_feed_restriction_requires_admin(client, session):
    register_user(client, nickname="target")
    other = register_user(client, nickname="regular")
    target_id = _get_user_id(session, "target")

    response = client.put(
        f"/users/{target_id}/feed-restriction",
        json={"is_feed_restricted": True},
        headers=auth_headers(other["token"]),
    )

    assert response.status_code == 403


def test_admin_can_restrict_and_unrestrict_feed(client, session):
    register_user(client, nickname="target")
    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")
    target_id = _get_user_id(session, "target")

    restrict_response = client.put(
        f"/users/{target_id}/feed-restriction",
        json={"is_feed_restricted": True},
        headers=auth_headers(admin["token"]),
    )
    assert restrict_response.status_code == 200
    assert restrict_response.json()["is_feed_restricted"] is True

    unrestrict_response = client.put(
        f"/users/{target_id}/feed-restriction",
        json={"is_feed_restricted": False},
        headers=auth_headers(admin["token"]),
    )
    assert unrestrict_response.status_code == 200
    assert unrestrict_response.json()["is_feed_restricted"] is False


def test_feed_restricted_user_posts_excluded_from_general_feed(client, session):
    register_user(client, nickname="target")
    target_id = _get_user_id(session, "target")

    entry = WorkoutEntry(
        date=date.today(), title="Тренировка нарушителя", user_id=target_id
    )
    session.add(entry)
    session.commit()

    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")

    client.put(
        f"/users/{target_id}/feed-restriction",
        json={"is_feed_restricted": True},
        headers=auth_headers(admin["token"]),
    )

    viewer = register_user(client, nickname="viewer")

    feed_response = client.get(
        "/diary/entries", headers=auth_headers(viewer["token"])
    )
    titles = [e["title"] for e in feed_response.json()]
    assert "Тренировка нарушителя" not in titles

    # Но на СВОЕЙ странице дневника запись остаётся видна.
    diary_page_response = client.get(
        f"/diary/entries?user_id={target_id}",
        headers=auth_headers(viewer["token"]),
    )
    diary_titles = [e["title"] for e in diary_page_response.json()]
    assert "Тренировка нарушителя" in diary_titles

    # И администратор всё равно видит её во вкладке "Администрирование".
    admin_feed_response = client.get(
        "/diary/entries?include_hidden=true",
        headers=auth_headers(admin["token"]),
    )
    admin_titles = [e["title"] for e in admin_feed_response.json()]
    assert "Тренировка нарушителя" in admin_titles


# --- Удаление пользователя ---------------------------------------------


def test_delete_user_requires_admin(client, session):
    register_user(client, nickname="target")
    other = register_user(client, nickname="regular")
    target_id = _get_user_id(session, "target")

    response = client.delete(
        f"/users/{target_id}", headers=auth_headers(other["token"])
    )

    assert response.status_code == 403


def test_admin_cannot_delete_self(client, session):
    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")
    admin_id = _get_user_id(session, "moderator")

    response = client.delete(
        f"/users/{admin_id}", headers=auth_headers(admin["token"])
    )

    assert response.status_code == 400


def test_admin_can_delete_regular_user(client, session):
    register_user(client, nickname="target")
    target_id = _get_user_id(session, "target")

    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")

    response = client.delete(
        f"/users/{target_id}", headers=auth_headers(admin["token"])
    )

    assert response.status_code == 204

    get_response = client.get(f"/users/{target_id}")
    assert get_response.status_code == 404


def test_deleting_user_with_owned_playground_requires_flag(client, session):
    owner = register_user(client, nickname="owner")
    owner_id = _get_user_id(session, "owner")

    playground_payload = {
        "name": "Площадка нарушителя",
        "locality": "Вильнюс",
        "address": "ул. Тестовая, 1",
        "latitude": 54.68,
        "longitude": 25.28,
        "size": "medium",
        "surface": "rubber",
        "access": "free",
        "condition": "acceptable",
        "opening_hours": "24/7",
        "description": "Тест.",
    }
    client.post(
        "/playgrounds/",
        json=playground_payload,
        headers=auth_headers(owner["token"]),
    )

    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")

    without_flag = client.delete(
        f"/users/{owner_id}", headers=auth_headers(admin["token"])
    )
    assert without_flag.status_code == 400

    with_flag = client.delete(
        f"/users/{owner_id}?with_owned_content=true",
        headers=auth_headers(admin["token"]),
    )
    assert with_flag.status_code == 204
