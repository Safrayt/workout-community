"""
Тесты на ensure_owner_or_admin (app/auth.py), на примере площадок
(app/routers/playgrounds.py) — та же проверка используется для
мероприятий, отзывов и т.п., но площадки покрывают её целиком:
редактирование и удаление, обычным пользователем и админом.

Если здесь что-то сломается — значит кто-то посторонний сможет
редактировать или удалять чужой контент, либо наоборот, владелец
своего контента лишится доступа. Это самый дорогой по последствиям
класс багов в проекте, поэтому покрыт тестами в первую очередь.
"""

from sqlmodel import select

from app.models import User
from conftest import auth_headers, register_user

VALID_PLAYGROUND_PAYLOAD = {
    "name": "Площадка наNers",
    "locality": "Вильнюс",
    "address": "ул. Тестовая, 1",
    "latitude": 54.68,
    "longitude": 25.28,
    "size": "medium",
    "surface": "rubber",
    "access": "free",
    "condition": "acceptable",
    "opening_hours": "24/7",
    "description": "Тестовая площадка для проверки прав доступа.",
}


def _create_playground(client, token: str) -> int:
    response = client.post(
        "/playgrounds/",
        json=VALID_PLAYGROUND_PAYLOAD,
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text

    return response.json()["id"]


def _make_admin(session, nickname: str) -> None:
    """
    Напрямую через БД — эндпоинта "сделать администратором" через API
    нет и не должно быть (иначе любой пользователь мог бы назначить
    себя админом сам себе).
    """
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.is_admin = True
    session.add(user)
    session.commit()


def test_anyone_can_read_playground_without_auth(client):
    owner = register_user(client, nickname="owner")
    playground_id = _create_playground(client, owner["token"])

    response = client.get(f"/playgrounds/{playground_id}")

    assert response.status_code == 200


def test_creating_playground_requires_auth(client):
    response = client.post("/playgrounds/", json=VALID_PLAYGROUND_PAYLOAD)

    assert response.status_code == 401


def test_owner_can_update_own_playground(client):
    owner = register_user(client, nickname="owner")
    playground_id = _create_playground(client, owner["token"])

    response = client.put(
        f"/playgrounds/{playground_id}",
        json={"name": "Новое название"},
        headers=auth_headers(owner["token"]),
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Новое название"


def test_other_user_cannot_update_playground(client):
    owner = register_user(client, nickname="owner")
    other = register_user(client, nickname="intruder")
    playground_id = _create_playground(client, owner["token"])

    response = client.put(
        f"/playgrounds/{playground_id}",
        json={"name": "Захватил чужую площадку"},
        headers=auth_headers(other["token"]),
    )

    assert response.status_code == 403


def test_other_user_cannot_delete_playground(client):
    owner = register_user(client, nickname="owner")
    other = register_user(client, nickname="intruder")
    playground_id = _create_playground(client, owner["token"])

    response = client.delete(
        f"/playgrounds/{playground_id}",
        headers=auth_headers(other["token"]),
    )

    assert response.status_code == 403

    # И сама площадка правда осталась на месте, а не только запрос
    # вернул "правильный" код ошибки при реально случившемся удалении.
    get_response = client.get(f"/playgrounds/{playground_id}")
    assert get_response.status_code == 200


def test_admin_can_update_someone_elses_playground(client, session):
    owner = register_user(client, nickname="owner")
    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")

    playground_id = _create_playground(client, owner["token"])

    response = client.put(
        f"/playgrounds/{playground_id}",
        json={"name": "Правка модератора"},
        headers=auth_headers(admin["token"]),
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Правка модератора"


def test_admin_can_delete_someone_elses_playground(client, session):
    owner = register_user(client, nickname="owner")
    admin = register_user(client, nickname="moderator")
    _make_admin(session, "moderator")

    playground_id = _create_playground(client, owner["token"])

    response = client.delete(
        f"/playgrounds/{playground_id}",
        headers=auth_headers(admin["token"]),
    )

    assert response.status_code == 204

    get_response = client.get(f"/playgrounds/{playground_id}")
    assert get_response.status_code == 404


def test_updating_nonexistent_playground_returns_404_not_403(client):
    """
    Важно, чтобы несуществующий id давал именно 404, а не 403/500 —
    иначе по различию кодов ответа можно было бы угадывать, какие id
    вообще существуют, даже не имея прав на них.
    """
    owner = register_user(client, nickname="owner")

    response = client.put(
        "/playgrounds/999999",
        json={"name": "Не важно"},
        headers=auth_headers(owner["token"]),
    )

    assert response.status_code == 404
