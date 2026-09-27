"""
Тесты комментариев к мероприятиям (CRUD) — уведомления покрыты
отдельно в test_notifications.py.
"""

from fastapi.testclient import TestClient

from conftest import auth_headers, register_user


def _create_playground(client: TestClient, token: str):
    response = client.post(
        "/playgrounds/",
        json={
            "name": "Площадка",
            "locality": "Рига",
            "address": "ул. Тестовая, 1",
            "latitude": 56.95,
            "longitude": 24.10,
            "size": "medium",
            "surface": "rubber",
            "access": "free",
            "condition": "acceptable",
            "opening_hours": "круглосуточно",
            "equipment": [],
        },
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text
    return response.json()


def _create_event(client: TestClient, token: str, playground_id: int):
    response = client.post(
        "/events/",
        json={
            "title": "Событие",
            "description": "",
            "start_date": "2026-10-01T09:00:00+00:00",
            "playground_id": playground_id,
        },
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_create_list_update_delete_event_comment(client: TestClient):
    creator = register_user(client, nickname="creator")
    commenter = register_user(client, nickname="commenter")

    playground = _create_playground(client, creator["token"])
    event = _create_event(client, creator["token"], playground["id"])

    create_response = client.post(
        f"/events/{event['id']}/comments",
        json={"text": "Во сколько встречаемся?"},
        headers=auth_headers(commenter["token"]),
    )
    assert create_response.status_code == 200, create_response.text
    comment = create_response.json()
    assert comment["text"] == "Во сколько встречаемся?"
    assert comment["event_id"] == event["id"]

    list_response = client.get(f"/events/{event['id']}/comments")
    assert list_response.status_code == 200, list_response.text
    assert len(list_response.json()) == 1

    update_response = client.put(
        f"/events/comments/{comment['id']}",
        json={"text": "В 9 утра!"},
        headers=auth_headers(commenter["token"]),
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["text"] == "В 9 утра!"

    # Чужой пользователь не может редактировать чужой комментарий.
    stranger = register_user(client, nickname="stranger")
    forbidden_response = client.put(
        f"/events/comments/{comment['id']}",
        json={"text": "Взлом"},
        headers=auth_headers(stranger["token"]),
    )
    assert forbidden_response.status_code == 403

    delete_response = client.delete(
        f"/events/comments/{comment['id']}",
        headers=auth_headers(commenter["token"]),
    )
    assert delete_response.status_code == 204

    assert client.get(f"/events/{event['id']}/comments").json() == []


def test_admin_can_delete_others_event_comment(client: TestClient, session):
    from sqlmodel import select

    from app.models import User

    creator = register_user(client, nickname="creator2")
    commenter = register_user(client, nickname="commenter2")
    admin = register_user(client, nickname="admin_user")

    admin_db_user = session.exec(
        select(User).where(User.nickname == "admin_user")
    ).first()
    admin_db_user.is_admin = True
    session.add(admin_db_user)
    session.commit()

    playground = _create_playground(client, creator["token"])
    event = _create_event(client, creator["token"], playground["id"])

    comment = client.post(
        f"/events/{event['id']}/comments",
        json={"text": "Комментарий"},
        headers=auth_headers(commenter["token"]),
    ).json()

    response = client.delete(
        f"/events/comments/{comment['id']}", headers=auth_headers(admin["token"])
    )
    assert response.status_code == 204


def test_empty_comment_text_rejected(client: TestClient):
    creator = register_user(client, nickname="creator3")
    playground = _create_playground(client, creator["token"])
    event = _create_event(client, creator["token"], playground["id"])

    response = client.post(
        f"/events/{event['id']}/comments",
        json={"text": "   "},
        headers=auth_headers(creator["token"]),
    )
    assert response.status_code == 400


def test_comment_on_nonexistent_event_returns_404(client: TestClient):
    user = register_user(client)
    response = client.post(
        "/events/999999/comments",
        json={"text": "Привет"},
        headers=auth_headers(user["token"]),
    )
    assert response.status_code == 404
