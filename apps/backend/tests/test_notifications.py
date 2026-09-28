"""
Тесты системы уведомлений: новые комментарии (дневник/площадки/
события) и упоминания @Ник — везде, где есть комментарии.
"""

from fastapi.testclient import TestClient

from conftest import auth_headers, register_user


def _create_playground(client: TestClient, token: str, name: str = "Турник у дома"):
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


def _create_event(client: TestClient, token: str, playground_id: int, title: str = "Утренняя тренировка"):
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


def _create_workout_entry(client: TestClient, token: str, title: str = "Тренировка"):
    response = client.post(
        "/diary/entries",
        json={
            "date": "2026-09-20",
            "title": title,
            "description": "",
            "tags": [],
        },
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text
    return response.json()


def _get_notifications(client: TestClient, token: str, type: str | None = None):
    params = {"type": type} if type else {}
    response = client.get(
        "/notifications/", params=params, headers=auth_headers(token)
    )
    assert response.status_code == 200, response.text
    return response.json()


def _unread_count(client: TestClient, token: str) -> int:
    response = client.get(
        "/notifications/unread-count", headers=auth_headers(token)
    )
    assert response.status_code == 200, response.text
    return response.json()["count"]


# --- Комментарии к записям дневника -----------------------------------

def test_diary_comment_notifies_entry_owner_but_not_commenter(client: TestClient):
    owner = register_user(client, nickname="owner")
    commenter = register_user(client, nickname="commenter")

    entry = _create_workout_entry(client, owner["token"], title="Пробежка")

    response = client.post(
        f"/diary/comments?record_id={entry['id']}&record_type=workout",
        json={"text": "Красавчик!"},
        headers=auth_headers(commenter["token"]),
    )
    assert response.status_code == 200, response.text

    owner_notifications = _get_notifications(client, owner["token"])
    assert len(owner_notifications) == 1
    assert owner_notifications[0]["type"] == "diary_comment"
    # Канонический адрес записи — в дневнике её автора.
    assert owner_notifications[0]["target_url"] == f"/u/owner/diary/{entry['id']}"
    assert owner_notifications[0]["target_title"] == "Пробежка"
    assert owner_notifications[0]["is_read"] is False

    # Комментатору о собственном комментарии уведомление не приходит.
    assert _get_notifications(client, commenter["token"]) == []


def test_diary_notification_url_encodes_nickname_and_supports_notes(
    client: TestClient,
):
    """
    Ник может содержать пробелы и кириллицу — в адресе он
    кодируется целиком (фронтенд раскодирует его через useParams()).
    Для заметок адрес — /u/<ник>/diary/notes/<id>.
    """
    from urllib.parse import quote

    owner = register_user(client, nickname="Иван Петров")
    commenter = register_user(client, nickname="commenter_url")

    note_response = client.post(
        "/diary/notes",
        json={"title": "Заметка", "text": "Текст заметки", "tags": []},
        headers=auth_headers(owner["token"]),
    )
    assert note_response.status_code == 200, note_response.text
    note = note_response.json()

    response = client.post(
        f"/diary/comments?record_id={note['id']}&record_type=note",
        json={"text": "Отличная заметка"},
        headers=auth_headers(commenter["token"]),
    )
    assert response.status_code == 200, response.text

    notifications = _get_notifications(client, owner["token"])
    assert len(notifications) == 1
    assert (
        notifications[0]["target_url"]
        == f"/u/{quote('Иван Петров', safe='')}/diary/notes/{note['id']}"
    )


def test_commenting_own_entry_does_not_self_notify(client: TestClient):
    author = register_user(client)
    entry = _create_workout_entry(client, author["token"])

    response = client.post(
        f"/diary/comments?record_id={entry['id']}&record_type=workout",
        json={"text": "Заметка для себя"},
        headers=auth_headers(author["token"]),
    )
    assert response.status_code == 200, response.text

    assert _get_notifications(client, author["token"]) == []


# --- Отзывы (комментарии) площадок -------------------------------------

def test_playground_review_notifies_creator(client: TestClient):
    creator = register_user(client, nickname="pg_creator")
    reviewer = register_user(client, nickname="pg_reviewer")

    playground = _create_playground(client, creator["token"], name="Спортгородок")

    response = client.post(
        "/reviews/",
        json={"playground_id": playground["id"], "text": "Отличная площадка, всем советую!"},
        headers=auth_headers(reviewer["token"]),
    )
    assert response.status_code == 200, response.text

    notifications = _get_notifications(client, creator["token"], type="playground_comment")
    assert len(notifications) == 1
    assert notifications[0]["target_url"] == f"/playgrounds/{playground['id']}"
    assert notifications[0]["target_title"] == "Спортгородок"


# --- Комментарии к мероприятиям -----------------------------------------

def test_event_comment_notifies_creator_and_participants_not_commenter(
    client: TestClient,
):
    creator = register_user(client, nickname="ev_creator")
    participant = register_user(client, nickname="ev_participant")
    commenter = register_user(client, nickname="ev_commenter")

    playground = _create_playground(client, creator["token"])
    event = _create_event(client, creator["token"], playground["id"])

    client.post(
        f"/events/{event['id']}/register", headers=auth_headers(participant["token"])
    )

    response = client.post(
        f"/events/{event['id']}/comments",
        json={"text": "Кто ещё придёт?"},
        headers=auth_headers(commenter["token"]),
    )
    assert response.status_code == 200, response.text

    for recipient in (creator, participant):
        notifications = _get_notifications(client, recipient["token"], type="event_comment")
        assert len(notifications) == 1, recipient["token"]
        assert notifications[0]["target_url"] == f"/events/{event['id']}"

    assert _get_notifications(client, commenter["token"], type="event_comment") == []


def test_event_creator_commenting_own_event_notifies_participant_only(
    client: TestClient,
):
    creator = register_user(client, nickname="ev_creator2")
    participant = register_user(client, nickname="ev_participant2")

    playground = _create_playground(client, creator["token"])
    event = _create_event(client, creator["token"], playground["id"])

    client.post(
        f"/events/{event['id']}/register", headers=auth_headers(participant["token"])
    )

    response = client.post(
        f"/events/{event['id']}/comments",
        json={"text": "Не забудьте воду!"},
        headers=auth_headers(creator["token"]),
    )
    assert response.status_code == 200, response.text

    assert len(_get_notifications(client, participant["token"])) == 1
    # Автор комментария (он же создатель) сам себе не уведомляется.
    assert _get_notifications(client, creator["token"]) == []


def test_cancelled_registration_does_not_receive_event_notifications(
    client: TestClient,
):
    creator = register_user(client, nickname="ev_creator3")
    cancelled_user = register_user(client, nickname="ev_cancelled")

    playground = _create_playground(client, creator["token"])
    event = _create_event(client, creator["token"], playground["id"])

    client.post(
        f"/events/{event['id']}/register",
        headers=auth_headers(cancelled_user["token"]),
    )
    client.delete(
        f"/events/{event['id']}/register",
        headers=auth_headers(cancelled_user["token"]),
    )

    client.post(
        f"/events/{event['id']}/comments",
        json={"text": "Событие всё ещё будет?"},
        headers=auth_headers(creator["token"]),
    )

    # creator сам не может себе уведомление — комментировал он сам;
    # проверяем, что отменивший регистрацию тоже ничего не получил.
    assert _get_notifications(client, cancelled_user["token"]) == []


# --- Упоминания @Ник ------------------------------------------------------

def test_mention_in_diary_comment_notifies_mentioned_user(client: TestClient):
    owner = register_user(client, nickname="entry_owner")
    commenter = register_user(client, nickname="commenter2")
    mentioned = register_user(client, nickname="Друг123")

    entry = _create_workout_entry(client, owner["token"])

    client.post(
        f"/diary/comments?record_id={entry['id']}&record_type=workout",
        json={"text": "Смотри, @Друг123, как круто получилось!"},
        headers=auth_headers(commenter["token"]),
    )

    mentioned_notifications = _get_notifications(client, mentioned["token"], type="mention")
    assert len(mentioned_notifications) == 1
    assert mentioned_notifications[0]["target_url"] == f"/u/entry_owner/diary/{entry['id']}"

    # Владелец записи ОТДЕЛЬНО получает свой diary_comment — упоминание
    # его не заменяет и не дублирует.
    owner_notifications = _get_notifications(client, owner["token"])
    assert len(owner_notifications) == 1
    assert owner_notifications[0]["type"] == "diary_comment"


def test_mention_in_program_comment(client: TestClient):
    author = register_user(client, nickname="prog_author")
    mentioned = register_user(client, nickname="Тренер")

    program = client.post(
        "/programs/",
        json={"title": "Программа для новичков", "description": ""},
        headers=auth_headers(author["token"]),
    ).json()

    client.post(
        f"/programs/{program['id']}/comments",
        json={"text": "@Тренер, посмотри, пожалуйста"},
        headers=auth_headers(author["token"]),
    )

    notifications = _get_notifications(client, mentioned["token"], type="mention")
    assert len(notifications) == 1
    assert notifications[0]["target_url"] == f"/programs/{program['id']}"
    assert notifications[0]["target_title"] == "Программа для новичков"


def test_self_mention_does_not_notify(client: TestClient):
    user = register_user(client, nickname="SelfMentioner")
    entry = _create_workout_entry(client, user["token"])

    client.post(
        f"/diary/comments?record_id={entry['id']}&record_type=workout",
        json={"text": "Я, @SelfMentioner, сам с собой разговариваю"},
        headers=auth_headers(user["token"]),
    )

    assert _get_notifications(client, user["token"]) == []


def test_mentioning_nonexistent_user_does_not_error(client: TestClient):
    owner = register_user(client, nickname="entry_owner2")
    entry = _create_workout_entry(client, owner["token"])

    response = client.post(
        f"/diary/comments?record_id={entry['id']}&record_type=workout",
        json={"text": "Привет, @НесуществующийНик, ты где?"},
        headers=auth_headers(owner["token"]),
    )
    assert response.status_code == 200, response.text


def test_duplicate_mention_notifies_once(client: TestClient):
    owner = register_user(client, nickname="entry_owner3")
    mentioned = register_user(client, nickname="Повторюн")
    entry = _create_workout_entry(client, owner["token"])

    client.post(
        f"/diary/comments?record_id={entry['id']}&record_type=workout",
        json={"text": "@Повторюн @Повторюн и ещё раз @Повторюн!"},
        headers=auth_headers(owner["token"]),
    )

    assert len(_get_notifications(client, mentioned["token"], type="mention")) == 1


# --- Фильтры, чтение, пагинация-выборка ---------------------------------

def test_filter_by_type_and_mark_as_read(client: TestClient):
    owner = register_user(client, nickname="filter_owner")
    commenter = register_user(client, nickname="filter_commenter")
    mentioner = register_user(client, nickname="filter_mentioner")

    entry = _create_workout_entry(client, owner["token"])
    playground = _create_playground(client, owner["token"], name="Другая площадка")

    client.post(
        f"/diary/comments?record_id={entry['id']}&record_type=workout",
        json={"text": "Комментарий к дневнику"},
        headers=auth_headers(commenter["token"]),
    )
    client.post(
        "/reviews/",
        json={"playground_id": playground["id"], "text": "Отличное место для тренировок!"},
        headers=auth_headers(commenter["token"]),
    )
    client.post(
        f"/diary/comments?record_id={entry['id']}&record_type=workout",
        json={"text": f"Э, @{owner['nickname']}, зацени"},
        headers=auth_headers(mentioner["token"]),
    )

    all_notifications = _get_notifications(client, owner["token"])
    assert len(all_notifications) == 4

    diary_only = _get_notifications(client, owner["token"], type="diary_comment")
    # Первый комментарий — обычный diary_comment; третий комментарий
    # тоже на запись owner'а (значит тоже diary_comment), а ЕЩЁ он
    # упоминает owner'а по нику — это отдельное mention-уведомление,
    # они не заменяют друг друга.
    assert len(diary_only) == 2

    playground_only = _get_notifications(client, owner["token"], type="playground_comment")
    assert len(playground_only) == 1

    mentions_only = _get_notifications(client, owner["token"], type="mention")
    assert len(mentions_only) == 1

    assert _unread_count(client, owner["token"]) == 4

    first_id = all_notifications[0]["id"]
    response = client.post(
        f"/notifications/{first_id}/read", headers=auth_headers(owner["token"])
    )
    assert response.status_code == 200, response.text
    assert response.json()["is_read"] is True

    assert _unread_count(client, owner["token"]) == 3

    response = client.post(
        "/notifications/read-all", headers=auth_headers(owner["token"])
    )
    assert response.status_code == 204, response.text

    assert _unread_count(client, owner["token"]) == 0


def test_cannot_mark_someone_elses_notification_as_read(client: TestClient):
    owner = register_user(client, nickname="priv_owner")
    stranger = register_user(client, nickname="priv_stranger")
    commenter = register_user(client, nickname="priv_commenter")

    entry = _create_workout_entry(client, owner["token"])
    client.post(
        f"/diary/comments?record_id={entry['id']}&record_type=workout",
        json={"text": "Привет"},
        headers=auth_headers(commenter["token"]),
    )

    notification_id = _get_notifications(client, owner["token"])[0]["id"]

    response = client.post(
        f"/notifications/{notification_id}/read",
        headers=auth_headers(stranger["token"]),
    )
    assert response.status_code == 403


def test_notifications_require_authentication(client: TestClient):
    response = client.get("/notifications/")
    assert response.status_code == 401
