"""
Тесты POST /users/me/delete — удаление собственного аккаунта из
настроек профиля («Опасная зона»).

SQLite по умолчанию не проверяет внешние ключи, а PostgreSQL на проде
проверяет — поэтому фикстура strict_fk ниже включает проверку и тут:
иначе тест не заметил бы, что в delete_user_completely забыли очистить
какую-то таблицу, ссылающуюся на пользователя.
"""

import pytest
from sqlmodel import select

from app.models import User
from app.models_complex import ComplexComment
from app.models_diary import WorkoutEntry
from app.models_event import Event, EventComment
from app.models_notification import Notification
from app.models_playground import Playground, PlaygroundHistoryEntry
from app.models_program import ProgramComment, ProgramDB, ProgramFavorite
from app.models_social import Subscription
from conftest import auth_headers, register_user

DELETE_URL = "/users/me/delete"


@pytest.fixture(autouse=True)
def strict_fk(session):
    """Включает проверку внешних ключей, как на PostgreSQL."""
    session.connection().exec_driver_sql("PRAGMA foreign_keys=ON")
    enabled = session.connection().exec_driver_sql(
        "PRAGMA foreign_keys"
    ).scalar()
    assert enabled == 1, "SQLite не включил проверку внешних ключей"


def _create_playground(client, token, name="Турник у дома"):
    response = client.post(
        "/playgrounds/",
        json={
            "name": name,
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


def _create_event(client, token, playground_id, title="Утренняя тренировка"):
    response = client.post(
        "/events/",
        json={
            "title": title,
            "description": "Приходите все!",
            "start_date": "2026-10-01T09:00:00+00:00",
            "playground_id": playground_id,
        },
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text
    return response.json()


def _create_program(client, token, title="Сила на турниках"):
    response = client.post(
        "/programs/",
        json={"title": title, "description": "Базовая программа"},
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text
    return response.json()


PROGRAM_STRUCTURE = {
    "sections": [
        {
            "name": None,
            "schemes": [
                {
                    "name": "Тренировка A",
                    "description": "Основная",
                    "blocks": [
                        {
                            "title": "Блок 1",
                            "exercises": ["Подтягивания"],
                            "scheme": "5x10",
                            "note": None,
                        }
                    ],
                    "note": None,
                }
            ],
        }
    ]
}


def _publish_program(client, token, program_id):
    headers = auth_headers(token)
    assert client.put(
        f"/programs/{program_id}/draft", json=PROGRAM_STRUCTURE, headers=headers
    ).status_code == 200
    assert client.post(
        f"/programs/{program_id}/publish", json={}, headers=headers
    ).status_code == 200


def _create_diary_entry(client, token, title="Тренировка"):
    response = client.post(
        "/diary/entries",
        json={"date": "2026-09-20", "title": title, "description": "", "tags": []},
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text
    return response.json()


def _delete_account(client, user, **extra):
    return client.post(
        DELETE_URL,
        json={"password": user["password"], **extra},
        headers=auth_headers(user["token"]),
    )


def _user_exists(session, nickname):
    session.expire_all()
    return (
        session.exec(select(User).where(User.nickname == nickname)).first()
        is not None
    )


# --- Доступ и пароль --------------------------------------------------------


def test_requires_authentication(client):
    response = client.post(DELETE_URL, json={"password": "password123"})

    assert response.status_code == 401


def test_wrong_password_does_not_delete(client, session):
    alice = register_user(client, nickname="alice")

    response = client.post(
        DELETE_URL,
        json={"password": "wrong-password"},
        headers=auth_headers(alice["token"]),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Неверный пароль"
    assert _user_exists(session, "alice")


def test_password_is_required(client):
    alice = register_user(client, nickname="alice")

    response = client.post(
        DELETE_URL, json={}, headers=auth_headers(alice["token"])
    )

    assert response.status_code == 422


def test_wrong_password_attempts_are_rate_limited(client):
    alice = register_user(client, nickname="alice")

    statuses = [
        client.post(
            DELETE_URL,
            json={"password": "wrong-password"},
            headers=auth_headers(alice["token"]),
        ).status_code
        for _ in range(11)
    ]

    assert statuses[:10] == [400] * 10
    assert statuses[10] == 429


# --- Успешное удаление ------------------------------------------------------


def test_deleted_user_cannot_use_token_or_log_in(client, session):
    alice = register_user(client, nickname="alice")

    response = _delete_account(client, alice)

    assert response.status_code == 204
    assert not _user_exists(session, "alice")

    me = client.get("/users/me", headers=auth_headers(alice["token"]))
    assert me.status_code == 401

    login = client.post(
        "/auth/login",
        data={"username": "alice", "password": alice["password"]},
    )
    assert login.status_code in (400, 401)


def test_nickname_can_be_registered_again_after_deletion(client):
    alice = register_user(client, nickname="alice")
    assert _delete_account(client, alice).status_code == 204

    again = client.post(
        "/auth/register",
        json={"nickname": "alice", "password": "password123"},
    )

    assert again.status_code == 200


def test_deletes_all_personal_data_and_keeps_other_users_data(client, session):
    """
    Алиса оставила следы везде, где только можно: дневник, подписки,
    комментарии к чужим событиям/комплексам/программам, избранное,
    уведомления (и полученные, и вызванные ею у Боба). Всё это должно
    уйти без ошибок внешних ключей, а данные Боба — остаться.
    """
    alice = register_user(client, nickname="alice")
    bob = register_user(client, nickname="bob")

    playground = _create_playground(client, bob["token"])
    event = _create_event(client, bob["token"], playground["id"])
    program = _create_program(client, bob["token"])
    _publish_program(client, bob["token"], program["id"])
    bob_entry = _create_diary_entry(client, bob["token"], "Запись Боба")
    _create_diary_entry(client, alice["token"], "Запись Алисы")

    # Алиса комментирует событие Боба -> уведомление Бобу (actor = Алиса).
    assert client.post(
        f"/events/{event['id']}/comments",
        json={"text": "Буду!"},
        headers=auth_headers(alice["token"]),
    ).status_code == 200

    assert client.post(
        f"/complexes/{_first_complex_id(session)}/comments",
        json={"text": "Отличный комплекс"},
        headers=auth_headers(alice["token"]),
    ).status_code == 200

    assert client.post(
        f"/programs/{program['id']}/comments",
        json={"text": "Интересная программа"},
        headers=auth_headers(alice["token"]),
    ).status_code == 200

    assert client.post(
        f"/programs/{program['id']}/favorite",
        headers=auth_headers(alice["token"]),
    ).status_code == 200

    alice_id = session.exec(
        select(User).where(User.nickname == "alice")
    ).first().id
    bob_id = session.exec(select(User).where(User.nickname == "bob")).first().id

    # Подписки в обе стороны.
    assert client.post(
        f"/subscriptions/{bob_id}", headers=auth_headers(alice["token"])
    ).status_code == 200
    assert client.post(
        f"/subscriptions/{alice_id}", headers=auth_headers(bob["token"])
    ).status_code == 200

    # Уведомление, адресованное самой Алисе.
    session.add(
        Notification(
            type="event_comment",
            target_url="/events/1",
            user_id=alice_id,
            actor_id=bob_id,
        )
    )
    # Запись в истории чужой площадки от имени Алисы.
    session.add(
        PlaygroundHistoryEntry(
            playground_id=playground["id"], user_id=alice_id, type="inspection"
        )
    )
    session.commit()

    assert _notifications_involving(session, alice_id) >= 2

    response = _delete_account(client, alice)

    assert response.status_code == 204, response.text
    session.expire_all()

    assert not _user_exists(session, "alice")

    # Ничего не осталось, что ссылается на Алису.
    for model, column in [
        (WorkoutEntry, WorkoutEntry.user_id),
        (EventComment, EventComment.user_id),
        (ComplexComment, ComplexComment.user_id),
        (ProgramComment, ProgramComment.user_id),
        (ProgramFavorite, ProgramFavorite.user_id),
        (PlaygroundHistoryEntry, PlaygroundHistoryEntry.user_id),
        (Subscription, Subscription.follower_id),
        (Subscription, Subscription.following_id),
    ]:
        assert session.exec(select(model).where(column == alice_id)).all() == [], (
            f"{model.__name__} всё ещё ссылается на удалённого пользователя"
        )

    assert _notifications_involving(session, alice_id) == 0

    # Данные Боба целы.
    assert session.get(Playground, playground["id"]) is not None
    assert session.get(Event, event["id"]) is not None
    assert session.get(ProgramDB, program["id"]) is not None
    assert session.get(WorkoutEntry, bob_entry["id"]) is not None
    assert _user_exists(session, "bob")


def _first_complex_id(session):
    from app.models_complex import ComplexDB

    return session.exec(select(ComplexDB)).first().id


def _notifications_involving(session, user_id):
    rows = session.exec(
        select(Notification).where(
            (Notification.user_id == user_id)
            | (Notification.actor_id == user_id)
        )
    ).all()
    return len(rows)


# --- Свой контент (площадки / события / программы) ---------------------------


def test_owned_content_requires_confirmation(client, session):
    alice = register_user(client, nickname="alice")
    playground = _create_playground(client, alice["token"], "Моя площадка")
    event = _create_event(client, alice["token"], playground["id"], "Моё событие")
    program = _create_program(client, alice["token"], "Моя программа")

    response = _delete_account(client, alice)

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert "Моя площадка" in detail
    assert "Моё событие" in detail
    assert "Моя программа" in detail

    # Ничего не удалено.
    session.expire_all()
    assert _user_exists(session, "alice")
    assert session.get(Playground, playground["id"]) is not None
    assert session.get(Event, event["id"]) is not None
    assert session.get(ProgramDB, program["id"]) is not None


def test_owned_content_is_deleted_with_explicit_confirmation(client, session):
    alice = register_user(client, nickname="alice")
    playground = _create_playground(client, alice["token"])
    event = _create_event(client, alice["token"], playground["id"])
    program = _create_program(client, alice["token"])

    response = _delete_account(client, alice, with_owned_content=True)

    assert response.status_code == 204, response.text
    session.expire_all()
    assert not _user_exists(session, "alice")
    assert session.get(Playground, playground["id"]) is None
    assert session.get(Event, event["id"]) is None
    assert session.get(ProgramDB, program["id"]) is None


def test_owned_playground_with_foreign_event_blocks_deletion(client, session):
    """
    Чужое мероприятие на площадке Алисы мешает удалить площадку —
    в этом случае ничего не должно сломаться молча: ответ с ошибкой,
    а пользователь остаётся.
    """
    alice = register_user(client, nickname="alice")
    bob = register_user(client, nickname="bob")
    playground = _create_playground(client, alice["token"])
    _create_event(client, bob["token"], playground["id"], "Событие Боба")

    response = _delete_account(client, alice, with_owned_content=True)

    assert response.status_code >= 400
    assert _user_exists(session, "alice")


# --- Администраторы ----------------------------------------------------------


def _make_admin(session, nickname):
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.is_admin = True
    session.add(user)
    session.commit()


def test_last_admin_cannot_delete_themselves(client, session):
    admin = register_user(client, nickname="boss")
    _make_admin(session, "boss")

    response = _delete_account(client, admin)

    assert response.status_code == 400
    assert "администратор" in response.json()["detail"]
    assert _user_exists(session, "boss")


def test_admin_can_delete_themselves_when_another_admin_exists(client, session):
    first = register_user(client, nickname="boss")
    register_user(client, nickname="deputy")
    _make_admin(session, "boss")
    _make_admin(session, "deputy")

    response = _delete_account(client, first)

    assert response.status_code == 204
    assert not _user_exists(session, "boss")
    assert _user_exists(session, "deputy")
