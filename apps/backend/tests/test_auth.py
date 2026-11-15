"""
Тесты на app/routers/auth.py и app/auth.py.

Покрывают то, поломка чего либо пускает кого-то не туда (обход
авторизации), либо блокирует всех подряд (баг в валидации при
регистрации/входе) — то есть самые дорогие по последствиям баги
в проекте.
"""

from datetime import datetime, timedelta, timezone

import jwt
from conftest import auth_headers, register_user

from app.auth import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM
from app.config import SECRET_KEY


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


# --- Продление сессии (/auth/refresh) --------------------------------------


def _token_expiry(token: str) -> datetime:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    return datetime.fromtimestamp(payload["exp"], tz=timezone.utc)


def test_token_lives_long_enough_to_not_log_people_out_daily(client):
    # Раньше токен жил 24 часа и человека выбрасывало на экран входа
    # каждый день.
    result = register_user(client)

    lifetime = _token_expiry(result["token"]) - datetime.now(timezone.utc)

    assert lifetime > timedelta(days=7)
    assert lifetime <= timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)


def test_refresh_requires_a_token(client):
    response = client.post("/auth/refresh")

    assert response.status_code == 401


def test_refresh_rejects_garbage_token(client):
    response = client.post(
        "/auth/refresh", headers=auth_headers("not-a-token")
    )

    assert response.status_code == 401


def test_refresh_returns_a_working_token_with_a_full_lifetime(client):
    result = register_user(client)

    response = client.post(
        "/auth/refresh", headers=auth_headers(result["token"])
    )

    assert response.status_code == 200

    new_token = response.json()["access_token"]
    assert new_token

    me = client.get("/users/me", headers=auth_headers(new_token))
    assert me.status_code == 200
    assert me.json()["nickname"] == "alice"

    lifetime = _token_expiry(new_token) - datetime.now(timezone.utc)
    assert lifetime > timedelta(days=29)


def test_expired_token_cannot_be_refreshed(client):
    result = register_user(client)
    me = client.get("/users/me", headers=auth_headers(result["token"]))

    expired = jwt.encode(
        {
            "sub": str(me.json()["id"]),
            "ver": 0,
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    response = client.post("/auth/refresh", headers=auth_headers(expired))

    assert response.status_code == 401


def test_token_revoked_by_password_change_cannot_be_refreshed(client):
    result = register_user(client)
    old_token = result["token"]

    changed = client.post(
        "/users/me/password",
        json={
            "current_password": result["password"],
            "new_password": "a-brand-new-password",
        },
        headers=auth_headers(old_token),
    )
    assert changed.status_code == 200

    # Сессии, открытые до смены пароля, продлить нельзя: смена пароля
    # должна по-прежнему разлогинивать всех остальных.
    response = client.post("/auth/refresh", headers=auth_headers(old_token))

    assert response.status_code == 401

    fresh = client.post(
        "/auth/refresh",
        headers=auth_headers(changed.json()["access_token"]),
    )

    assert fresh.status_code == 200
