"""
Тесты на восстановление доступа: ключ восстановления, сброс пароля по
ключу, смена пароля и отзыв старых сессий (app/recovery.py,
app/routers/auth.py, app/routers/users.py).

Здесь живёт самое чувствительное место авторизации: ошибка в этих
эндпоинтах либо пускает постороннего в чужой аккаунт, либо навсегда
запирает владельца снаружи.
"""

import re
from datetime import datetime, timedelta, timezone

import jwt
from sqlmodel import select

from conftest import auth_headers, register_user

from app.models import User
from app.recovery import (
    RECOVERY_KEY_ALPHABET,
    generate_recovery_key,
    normalize_recovery_key,
)

KEY_PATTERN = re.compile(r"^([0-9A-HJKMNP-TV-Z]{4}-){5}[0-9A-HJKMNP-TV-Z]{4}$")


def recover(client, nickname, key, new_password="brand-new-password"):
    return client.post(
        "/auth/recover",
        json={
            "nickname": nickname,
            "recovery_key": key,
            "new_password": new_password,
        },
    )


def login(client, nickname, password):
    return client.post(
        "/auth/login",
        data={"username": nickname, "password": password},
    )


# ---------------------------------------------------------------------
# Сам ключ
# ---------------------------------------------------------------------


def test_generated_key_has_expected_format():
    key = generate_recovery_key()

    assert KEY_PATTERN.match(key), key
    assert set(key.replace("-", "")) <= set(RECOVERY_KEY_ALPHABET)


def test_generated_keys_are_unique():
    assert len({generate_recovery_key() for _ in range(200)}) == 200


def test_normalize_ignores_case_dashes_spaces_and_lookalikes():
    canonical = "ABCD1234EFGH5678JKMN0PQR"

    assert normalize_recovery_key("abcd-1234-efgh-5678-jkmn-0pqr") == canonical
    assert normalize_recovery_key("ABCD 1234 EFGH 5678 JKMN 0PQR") == canonical
    # O вместо 0 и I/L вместо 1 принимаются как цифры.
    assert (
        normalize_recovery_key("ABCD-I234-EFGH-5678-JKMN-OPQR")
        == canonical
    )
    assert (
        normalize_recovery_key("ABCD-l234-EFGH-5678-JKMN-OPQR")
        == canonical
    )


# ---------------------------------------------------------------------
# Регистрация выдаёт ключ
# ---------------------------------------------------------------------


def test_register_returns_recovery_key_and_stores_only_its_hash(
    client, session
):
    result = register_user(client)

    assert KEY_PATTERN.match(result["recovery_key"])

    user = session.exec(select(User).where(User.nickname == "alice")).one()

    assert user.recovery_key_hash is not None
    assert user.recovery_key_hash.startswith("$2")  # bcrypt
    assert result["recovery_key"] not in user.recovery_key_hash
    assert user.recovery_key_created_at is not None


def test_current_user_reports_has_recovery_key(client):
    result = register_user(client)

    response = client.get("/users/me", headers=auth_headers(result["token"]))

    assert response.status_code == 200
    assert response.json()["has_recovery_key"] is True


def test_secrets_never_appear_in_api_responses(client):
    alice = register_user(client, nickname="alice")
    register_user(client, nickname="bob")

    own = client.get("/users/me", headers=auth_headers(alice["token"])).json()
    listing = client.get(
        "/users/", headers=auth_headers(alice["token"])
    ).json()

    forbidden = {
        "password_hash",
        "recovery_key_hash",
        "recovery_key",
        "token_version",
    }

    assert not forbidden & set(own)

    for user in listing:
        assert not forbidden & set(user)
        # Есть ли у других пользователей ключ — не чужое дело.
        assert "has_recovery_key" not in user


# ---------------------------------------------------------------------
# Сброс пароля по ключу
# ---------------------------------------------------------------------


def test_recover_sets_new_password_and_logs_in(client):
    result = register_user(client, password="old-password-123")

    response = recover(client, "alice", result["recovery_key"])

    assert response.status_code == 200

    body = response.json()

    # Токен из ответа рабочий.
    me = client.get("/users/me", headers=auth_headers(body["access_token"]))
    assert me.status_code == 200
    assert me.json()["nickname"] == "alice"

    # Новый пароль работает, старый — нет.
    assert login(client, "alice", "brand-new-password").status_code == 200
    assert login(client, "alice", "old-password-123").status_code == 401


def test_recover_rotates_key_old_one_stops_working(client):
    result = register_user(client)
    old_key = result["recovery_key"]

    first = recover(client, "alice", old_key, "first-new-password")
    assert first.status_code == 200

    new_key = first.json()["recovery_key"]
    assert KEY_PATTERN.match(new_key)
    assert new_key != old_key

    # Использованный ключ больше не подходит...
    assert recover(client, "alice", old_key, "hacker-password-1").status_code == 401
    # ...а новый — подходит.
    assert recover(client, "alice", new_key, "second-new-password").status_code == 200


def test_recover_accepts_sloppily_typed_key(client):
    result = register_user(client)

    sloppy = result["recovery_key"].lower().replace("-", " ")

    assert recover(client, "alice", sloppy).status_code == 200


def test_recover_revokes_all_previous_sessions(client):
    result = register_user(client)
    old_token = result["token"]

    assert (
        client.get("/users/me", headers=auth_headers(old_token)).status_code
        == 200
    )

    recover(client, "alice", result["recovery_key"])

    assert (
        client.get("/users/me", headers=auth_headers(old_token)).status_code
        == 401
    )


def test_recover_with_wrong_key_fails(client):
    register_user(client)

    response = recover(client, "alice", generate_recovery_key())

    assert response.status_code == 401


def test_recover_for_unknown_nickname_looks_the_same(client):
    """
    Тот же ответ, что и для неверного ключа к существующему нику, —
    чтобы по ответу нельзя было узнавать, какие ники зарегистрированы.
    """
    register_user(client)

    wrong_key = recover(client, "alice", generate_recovery_key())
    unknown_user = recover(client, "nobody", generate_recovery_key())

    assert wrong_key.status_code == unknown_user.status_code == 401
    assert wrong_key.json() == unknown_user.json()


def test_recover_does_not_change_password_on_wrong_key(client):
    register_user(client, password="old-password-123")

    recover(client, "alice", generate_recovery_key(), "hacker-password-1")

    assert login(client, "alice", "old-password-123").status_code == 200
    assert login(client, "alice", "hacker-password-1").status_code == 401


def test_recover_rejects_weak_new_password(client):
    result = register_user(client)

    response = recover(client, "alice", result["recovery_key"], "short")

    assert response.status_code == 422

    # Неудачная попытка не сожгла ключ.
    assert recover(client, "alice", result["recovery_key"]).status_code == 200


def test_recover_wrong_key_for_account_without_key(client, session):
    """Аккаунт, созданный до появления ключей: восстановление недоступно."""
    register_user(client)

    user = session.exec(select(User).where(User.nickname == "alice")).one()
    user.recovery_key_hash = None
    session.add(user)
    session.commit()

    assert recover(client, "alice", generate_recovery_key()).status_code == 401


def test_recover_locks_nickname_after_repeated_failures(client):
    result = register_user(client)

    for _ in range(5):
        assert (
            recover(client, "alice", generate_recovery_key()).status_code
            == 401
        )

    # Дальше — 429, даже с верным ключом: перебор по нику остановлен.
    assert recover(client, "alice", result["recovery_key"]).status_code == 429


def test_successful_recoveries_do_not_count_toward_lockout(client):
    result = register_user(client)

    for _ in range(4):
        recover(client, "alice", generate_recovery_key())

    assert recover(client, "alice", result["recovery_key"]).status_code == 200


# ---------------------------------------------------------------------
# Смена пароля
# ---------------------------------------------------------------------


def change_password(client, token, current, new):
    return client.post(
        "/users/me/password",
        json={"current_password": current, "new_password": new},
        headers=auth_headers(token),
    )


def test_change_password_success(client):
    result = register_user(client, password="old-password-123")

    response = change_password(
        client, result["token"], "old-password-123", "new-password-456"
    )

    assert response.status_code == 200
    assert login(client, "alice", "new-password-456").status_code == 200
    assert login(client, "alice", "old-password-123").status_code == 401


def test_change_password_revokes_old_tokens_but_returns_fresh_one(client):
    result = register_user(client, password="old-password-123")

    response = change_password(
        client, result["token"], "old-password-123", "new-password-456"
    )

    fresh_token = response.json()["access_token"]

    assert (
        client.get("/users/me", headers=auth_headers(result["token"])).status_code
        == 401
    )
    assert (
        client.get("/users/me", headers=auth_headers(fresh_token)).status_code
        == 200
    )


def test_change_password_wrong_current_is_400_not_401(client):
    """400, а не 401: на 401 фронтенд разлогинивает пользователя."""
    result = register_user(client, password="old-password-123")

    response = change_password(
        client, result["token"], "wrong-password-1", "new-password-456"
    )

    assert response.status_code == 400
    assert login(client, "alice", "old-password-123").status_code == 200


def test_change_password_rejects_same_or_weak_password(client):
    result = register_user(client, password="old-password-123")

    same = change_password(
        client, result["token"], "old-password-123", "old-password-123"
    )
    weak = change_password(client, result["token"], "old-password-123", "short")

    assert same.status_code == 400
    assert weak.status_code == 422


def test_change_password_requires_authentication(client):
    response = client.post(
        "/users/me/password",
        json={"current_password": "x" * 8, "new_password": "y" * 8},
    )

    assert response.status_code == 401


def test_change_password_keeps_recovery_key_valid(client):
    result = register_user(client, password="old-password-123")

    change_password(
        client, result["token"], "old-password-123", "new-password-456"
    )

    assert recover(client, "alice", result["recovery_key"]).status_code == 200


# ---------------------------------------------------------------------
# Новый ключ в настройках
# ---------------------------------------------------------------------


def regenerate(client, token, password):
    return client.post(
        "/users/me/recovery-key",
        json={"current_password": password},
        headers=auth_headers(token),
    )


def test_regenerate_key_replaces_old_one(client):
    result = register_user(client, password="old-password-123")
    old_key = result["recovery_key"]

    response = regenerate(client, result["token"], "old-password-123")

    assert response.status_code == 200

    new_key = response.json()["recovery_key"]

    assert KEY_PATTERN.match(new_key)
    assert new_key != old_key

    assert recover(client, "alice", old_key).status_code == 401
    assert recover(client, "alice", new_key).status_code == 200


def test_regenerate_key_does_not_log_out_current_session(client):
    result = register_user(client, password="old-password-123")

    regenerate(client, result["token"], "old-password-123")

    assert (
        client.get("/users/me", headers=auth_headers(result["token"])).status_code
        == 200
    )


def test_regenerate_key_requires_correct_password(client):
    result = register_user(client, password="old-password-123")

    response = regenerate(client, result["token"], "wrong-password-1")

    assert response.status_code == 400

    # Прежний ключ не пострадал.
    assert recover(client, "alice", result["recovery_key"]).status_code == 200


def test_account_without_key_can_create_first_key(client, session):
    result = register_user(client, password="old-password-123")

    user = session.exec(select(User).where(User.nickname == "alice")).one()
    user.recovery_key_hash = None
    user.recovery_key_created_at = None
    session.add(user)
    session.commit()

    me = client.get("/users/me", headers=auth_headers(result["token"]))
    assert me.json()["has_recovery_key"] is False

    response = regenerate(client, result["token"], "old-password-123")
    assert response.status_code == 200

    me = client.get("/users/me", headers=auth_headers(result["token"]))
    assert me.json()["has_recovery_key"] is True

    assert (
        recover(client, "alice", response.json()["recovery_key"]).status_code
        == 200
    )


# ---------------------------------------------------------------------
# Совместимость со старыми токенами
# ---------------------------------------------------------------------


def test_token_issued_before_session_versions_still_works(client, session):
    """
    Токены, выпущенные до обновления, не содержат поля "ver" — после
    выкатки обновления они не должны разом разлогинить всех.
    """
    from app.config import SECRET_KEY

    register_user(client)
    user = session.exec(select(User).where(User.nickname == "alice")).one()

    legacy_token = jwt.encode(
        {
            "sub": str(user.id),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        SECRET_KEY,
        algorithm="HS256",
    )

    response = client.get("/users/me", headers=auth_headers(legacy_token))

    assert response.status_code == 200
