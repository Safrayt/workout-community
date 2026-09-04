"""
Тесты на app/routers/auth.py и app/auth.py.

Покрывают то, поломка чего либо пускает кого-то не туда (обход
авторизации), либо блокирует всех подряд (баг в валидации при
регистрации/входе) — то есть самые дорогие по последствиям баги
в проекте.
"""

from conftest import auth_headers, register_user


def test_register_returns_usable_token(client):
    result = register_user(client)

    assert result["token"]

    # Токен должен реально работать, а не просто присутствовать
    # в ответе — проверяем на защищённом эндпоинте.
    response = client.get("/users/me", headers=auth_headers(result["token"]))

    assert response.status_code == 200
    assert response.json()["nickname"] == "alice"


def test_register_duplicate_nickname_is_rejected(client):
    register_user(client, nickname="alice")

    response = client.post(
        "/auth/register",
        json={"nickname": "alice", "password": "another-password"},
    )

    assert response.status_code == 400


def test_register_rejects_short_password(client):
    response = client.post(
        "/auth/register",
        json={"nickname": "bob", "password": "short"},
    )

    assert response.status_code == 422


def test_register_rejects_short_nickname(client):
    response = client.post(
        "/auth/register",
        json={"nickname": "a", "password": "password123"},
    )

    assert response.status_code == 422


def test_login_with_correct_credentials_succeeds(client):
    register_user(client, nickname="alice", password="password123")

    response = client.post(
        "/auth/login",
        data={"username": "alice", "password": "password123"},
    )

    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_with_wrong_password_fails(client):
    register_user(client, nickname="alice", password="password123")

    response = client.post(
        "/auth/login",
        data={"username": "alice", "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_login_with_unknown_nickname_fails(client):
    """
    Несуществующий nickname должен отвечать так же (401 + похожее по
    времени поведение), как и существующий с неверным паролем — иначе
    по факту различия ответов можно перебором узнавать, какие nickname
    вообще зарегистрированы (см. комментарий про тайминг-атаку в
    app/routers/auth.py).
    """
    response = client.post(
        "/auth/login",
        data={"username": "nobody-registered", "password": "whatever123"},
    )

    assert response.status_code == 401


def test_protected_endpoint_without_token_is_rejected(client):
    response = client.get("/users/me")

    assert response.status_code == 401


def test_protected_endpoint_with_garbage_token_is_rejected(client):
    response = client.get(
        "/users/me", headers=auth_headers("this-is-not-a-real-jwt")
    )

    assert response.status_code == 401


def test_protected_endpoint_with_token_for_deleted_user_is_rejected(client, session):
    """
    Токен подписан валидно, но пользователя, на которого он указывает,
    больше нет в базе (удалили аккаунт) — должен давать 401, а не 500
    или, того хуже, пропускать запрос с несуществующим пользователем.
    """
    result = register_user(client)

    from sqlmodel import select

    from app.models import User

    db_user = session.exec(
        select(User).where(User.nickname == "alice")
    ).first()
    session.delete(db_user)
    session.commit()

    response = client.get("/users/me", headers=auth_headers(result["token"]))

    assert response.status_code == 401
