"""
Тесты на last_seen_at ("последнее посещение сайта" в разделе
"Пользователи") — см. touch_last_seen в app/auth.py.
"""

from datetime import datetime, timedelta, timezone

from conftest import auth_headers, register_user

import app.auth as auth_module


def test_last_seen_is_none_right_after_registration(client, session):
    """/auth/register сам по себе не проходит через
    get_current_user (выдаёт токен напрямую) — значит, до первого
    запроса с этим токеном last_seen_at ещё не проставлен."""
    register_user(client)

    from app.models import User

    user = session.get(User, 1)
    session.refresh(user)

    assert user.last_seen_at is None


def test_last_seen_updates_on_authenticated_request(client, session):
    result = register_user(client)

    from app.models import User

    user = session.get(User, 1)
    user.last_seen_at = datetime.now(timezone.utc) - timedelta(hours=1)
    session.add(user)
    session.commit()

    response = client.get("/users/me", headers=auth_headers(result["token"]))
    assert response.status_code == 200

    session.refresh(user)

    assert datetime.now(timezone.utc) - user.last_seen_at.replace(
        tzinfo=timezone.utc
    ) < timedelta(minutes=1)


def test_last_seen_is_throttled(client, session, monkeypatch):
    """Повторный запрос сразу после предыдущего не должен переписывать
    last_seen_at заново — обновление троттлится
    LAST_SEEN_UPDATE_INTERVAL (см. app/auth.py)."""
    result = register_user(client)

    from app.models import User

    user = session.get(User, 1)
    recent = datetime.now(timezone.utc) - timedelta(seconds=5)
    user.last_seen_at = recent
    session.add(user)
    session.commit()

    monkeypatch.setattr(
        auth_module, "LAST_SEEN_UPDATE_INTERVAL", timedelta(minutes=5)
    )

    response = client.get("/users/me", headers=auth_headers(result["token"]))
    assert response.status_code == 200

    session.refresh(user)

    assert user.last_seen_at.replace(tzinfo=timezone.utc) == recent


def test_last_seen_included_in_user_read(client):
    result = register_user(client)

    response = client.get("/users/me", headers=auth_headers(result["token"]))

    assert response.status_code == 200
    assert "last_seen_at" in response.json()
    assert response.json()["last_seen_at"] is not None
