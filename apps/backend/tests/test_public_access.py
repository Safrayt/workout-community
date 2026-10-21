"""
Что видит человек без входа в систему.

Разделы "Упражнения", "Статьи", "События" (и площадки) открыты для
чтения без авторизации — на этом держится гостевой режим фронтенда
(см. handle.guest в src/app/router.tsx). Эти тесты фиксируют контракт
с обеих сторон: чтение без токена работает, а любая запись и всё
приватное по-прежнему закрыты.

Отдельные подробности (черновики статей, права на запись и т.д.)
проверяются в test_articles.py, test_exercises.py и test_events.py —
здесь только граница "гость / не гость".
"""

import pytest
from sqlmodel import select

from app.models import User
from conftest import auth_headers, register_user
from test_articles import VALID_PAYLOAD as ARTICLE_PAYLOAD
from test_exercises import VALID_PAYLOAD as EXERCISE_PAYLOAD
from test_programs import SAMPLE_STRUCTURE as PROGRAM_STRUCTURE

COMPLEX_ID = "hannibal-scheme-steel"  # комплекс из сида


@pytest.fixture(name="content")
def content_fixture(client, session):
    """
    Контент от лица разных людей: упражнения и статьи создаёт
    администратор, площадку, событие, комментарий и регистрацию —
    обычные пользователи.
    """
    admin = register_user(client, nickname="admin_user")
    user = session.exec(select(User).where(User.nickname == "admin_user")).first()
    user.is_admin = True
    session.add(user)
    session.commit()
    admin_headers = auth_headers(admin["token"])

    exercise = client.post(
        "/exercises/", json=EXERCISE_PAYLOAD, headers=admin_headers
    )
    assert exercise.status_code == 201, exercise.text

    published = client.post(
        "/articles/", json=ARTICLE_PAYLOAD, headers=admin_headers
    )
    assert published.status_code == 201, published.text

    draft = client.post(
        "/articles/",
        json={**ARTICLE_PAYLOAD, "title": "Черновик", "is_published": False},
        headers=admin_headers,
    )
    assert draft.status_code == 201, draft.text

    organizer = register_user(client, nickname="organizer")
    organizer_headers = auth_headers(organizer["token"])

    playground = client.post(
        "/playgrounds/",
        json={
            "name": "Турник у дома",
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
        headers=organizer_headers,
    )
    assert playground.status_code == 200, playground.text

    event = client.post(
        "/events/",
        json={
            "title": "Утренняя тренировка",
            "description": "Приходите все!",
            "start_date": "2026-10-01T09:00:00+00:00",
            "playground_id": playground.json()["id"],
        },
        headers=organizer_headers,
    )
    assert event.status_code == 200, event.text

    event_id = event.json()["id"]

    comment = client.post(
        f"/events/{event_id}/comments",
        json={"text": "Буду!"},
        headers=organizer_headers,
    )
    assert comment.status_code == 200, comment.text

    registration = client.post(
        f"/events/{event_id}/register", headers=organizer_headers
    )
    assert registration.status_code == 200, registration.text

    # Комплекс — из сида; на нём комментарий организатора.
    complex_comment = client.post(
        f"/complexes/{COMPLEX_ID}/comments",
        json={"text": "Хороший комплекс"},
        headers=organizer_headers,
    )
    assert complex_comment.status_code == 200, complex_comment.text

    # Программы: одна опубликована (с версией и комментарием), одна — черновик.
    program = client.post(
        "/programs/",
        json={"title": "Сила на турниках", "description": "Базовая программа"},
        headers=organizer_headers,
    )
    assert program.status_code == 200, program.text
    program_id = program.json()["id"]

    assert client.put(
        f"/programs/{program_id}/draft",
        json=PROGRAM_STRUCTURE,
        headers=organizer_headers,
    ).status_code == 200
    version = client.post(
        f"/programs/{program_id}/publish", json={}, headers=organizer_headers
    )
    assert version.status_code == 200, version.text

    program_comment = client.post(
        f"/programs/{program_id}/comments",
        json={"text": "Интересная программа"},
        headers=organizer_headers,
    )
    assert program_comment.status_code == 200, program_comment.text

    draft_program = client.post(
        "/programs/",
        json={"title": "Секретный черновик программы", "description": "Не готова"},
        headers=organizer_headers,
    )
    assert draft_program.status_code == 200, draft_program.text

    return {
        "program_id": program_id,
        "program_version_id": version.json()["id"],
        "draft_program_id": draft_program.json()["id"],
        "exercise_id": exercise.json()["id"],
        "article_id": published.json()["id"],
        "draft_id": draft.json()["id"],
        "event_id": event_id,
        "playground_id": playground.json()["id"],
    }


# --- Чтение без токена -------------------------------------------------------


def test_guest_can_read_every_public_section(client, content):
    """Всё, что фронтенд запрашивает на публичных страницах."""
    urls = [
        # Упражнения
        "/exercises/",
        f"/exercises/{content['exercise_id']}",
        # Статьи
        "/articles/",
        "/articles/tags",
        f"/articles/{content['article_id']}",
        # События: список, страница, комментарии и регистрации
        "/events/",
        f"/events/{content['event_id']}",
        f"/events/{content['event_id']}/comments",
        "/events/registrations",
        # Площадка, к которой привязано событие, и имена людей
        "/playgrounds/",
        f"/playgrounds/{content['playground_id']}",
        "/users/",
        # Страница конкретной площадки: отзывы и общая лента дневников
        # (для счётчиков активности; приватность фильтрует сервер).
        f"/reviews/?playground_id={content['playground_id']}",
        "/diary/entries",
        # Комплексы: каталог, один комплекс, комментарии
        "/complexes/",
        f"/complexes/{COMPLEX_ID}",
        f"/complexes/{COMPLEX_ID}/comments",
        # Программы: каталог, одна программа, версии и комментарии
        "/programs/",
        f"/programs/{content['program_id']}",
        f"/programs/{content['program_id']}/versions",
        f"/programs/{content['program_id']}/versions/{content['program_version_id']}",
        f"/programs/{content['program_id']}/comments",
    ]

    for url in urls:
        response = client.get(url)

        assert response.status_code == 200, f"{url}: {response.status_code}"


def test_guest_sees_published_article_content(client, content):
    response = client.get(f"/articles/{content['article_id']}")

    assert response.json()["title"] == ARTICLE_PAYLOAD["title"]


def test_guest_does_not_see_article_drafts(client, content):
    titles = [
        item["title"] for item in client.get("/articles/").json()["items"]
    ]

    assert ARTICLE_PAYLOAD["title"] in titles
    assert "Черновик" not in titles
    assert client.get(f"/articles/{content['draft_id']}").status_code == 404


def test_guest_sees_event_comments_and_participants(client, content):
    comments = client.get(f"/events/{content['event_id']}/comments").json()
    registrations = client.get("/events/registrations").json()

    assert [c["text"] for c in comments] == ["Буду!"]
    assert len(registrations) == 1


def test_guest_sees_published_programs_only(client, content):
    titles = [item["title"] for item in client.get("/programs/").json()]

    assert "Сила на турниках" in titles
    assert "Секретный черновик программы" not in titles
    assert client.get(f"/programs/{content['draft_program_id']}").status_code in (
        403,
        404,
    )


def test_guest_sees_complex_and_program_comments(client, content):
    complex_comments = client.get(f"/complexes/{COMPLEX_ID}/comments").json()
    program_comments = client.get(
        f"/programs/{content['program_id']}/comments"
    ).json()

    assert [c["text"] for c in complex_comments] == ["Хороший комплекс"]
    assert [c["text"] for c in program_comments] == ["Интересная программа"]


def test_guest_program_is_not_marked_as_favorite(client, content):
    program = client.get(f"/programs/{content['program_id']}").json()

    assert program["is_favorited_by_viewer"] is False


# --- Запись и приватное по-прежнему закрыты -----------------------------------


@pytest.mark.parametrize(
    "method, url",
    [
        ("POST", "/exercises/"),
        ("POST", "/articles/"),
        ("POST", "/events/"),
        ("POST", "/events/{event_id}/comments"),
        ("POST", "/events/{event_id}/register"),
        ("DELETE", "/events/{event_id}/register"),
        ("PUT", "/events/{event_id}"),
        ("DELETE", "/events/{event_id}"),
        ("DELETE", "/exercises/{exercise_id}"),
        ("DELETE", "/articles/{article_id}"),
        ("GET", "/users/me"),
        # Комплексы: история выполнений и лучший результат — личные.
        ("GET", "/complexes/" + COMPLEX_ID + "/completions"),
        ("GET", "/complexes/" + COMPLEX_ID + "/best"),
        ("POST", "/complexes/" + COMPLEX_ID + "/completions"),
        ("POST", "/complexes/" + COMPLEX_ID + "/comments"),
        # Программы: свои, избранное, черновик версии, запись.
        ("GET", "/programs/mine"),
        ("GET", "/programs/favorites/mine"),
        ("GET", "/programs/{program_id}/draft"),
        ("POST", "/programs/"),
        ("POST", "/programs/{program_id}/favorite"),
        ("POST", "/programs/{program_id}/comments"),
        # Избранное — личное: только своё, поэтому гостю фронтенд его
        # не запрашивает (см. FavoriteContext).
        ("GET", "/favorites"),
        ("POST", "/favorites/{playground_id}"),
        ("POST", "/reviews/"),
        ("POST", "/playgrounds/{playground_id}/confirm-inspection"),
        # Общая лента дневников открыта (с учётом приватности), а вот
        # "показать скрытое" — только для вошедшего администратора.
        ("GET", "/diary/entries?include_hidden=true"),
        ("GET", "/notifications/"),
    ],
)
def test_guest_cannot_write_or_read_private_data(client, content, method, url):
    response = client.request(
        method, url.format(**content), json={"text": "x"} if method != "GET" else None
    )

    assert response.status_code == 401, f"{method} {url}: {response.status_code}"
