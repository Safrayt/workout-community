"""
Тесты раздела «Программы» — проверяют именно те правила, которые
явно оговорены в UX-документе: неизменяемость опубликованных версий,
обязательность комментария об изменениях начиная со второй публикации,
автоматический выбор версии и её фиксацию в записи дневника,
независимость избранного от факта тренировки, видимость черновиков
только автору.
"""

from fastapi.testclient import TestClient

from tests.conftest import auth_headers, register_user


def _create_program(client: TestClient, token: str, **overrides) -> dict:
    payload = {"title": "Сила на турниках", "description": "Базовая программа"}
    payload.update(overrides)

    response = client.post("/programs/", json=payload, headers=auth_headers(token))
    assert response.status_code == 200, response.text

    return response.json()


SAMPLE_STRUCTURE = {
    "sections": [
        {
            "name": None,
            "schemes": [
                {
                    "name": "Тренировка A",
                    "description": "Основная силовая",
                    "blocks": [
                        {
                            "title": "Блок 1",
                            "exercises": ["Подтягивания", "Отжимания на брусьях"],
                            "scheme": "5x10",
                            "note": "Отдых 2 минуты",
                        }
                    ],
                    "note": None,
                }
            ],
        }
    ]
}


def test_create_program_starts_as_unpublished_draft(client: TestClient):
    user = register_user(client)

    program = _create_program(client, user["token"])

    assert program["is_published"] is False
    assert program["current_version_id"] is None

    draft = client.get(
        f"/programs/{program['id']}/draft", headers=auth_headers(user["token"])
    )
    assert draft.status_code == 200
    assert draft.json()["status"] == "draft"
    assert draft.json()["version_number"] is None


def test_draft_program_hidden_from_public_catalog_and_strangers(client: TestClient):
    author = register_user(client, "author")
    stranger = register_user(client, "stranger")

    program = _create_program(client, author["token"])

    catalog = client.get("/programs/")
    assert program["id"] not in [p["id"] for p in catalog.json()]

    # Чужой черновик не виден даже по прямой ссылке.
    response = client.get(
        f"/programs/{program['id']}", headers=auth_headers(stranger["token"])
    )
    assert response.status_code == 404

    # Автору — виден.
    response = client.get(
        f"/programs/{program['id']}", headers=auth_headers(author["token"])
    )
    assert response.status_code == 200


def test_first_publish_does_not_require_changelog(client: TestClient):
    user = register_user(client)
    program = _create_program(client, user["token"])
    headers = auth_headers(user["token"])

    client.put(f"/programs/{program['id']}/draft", json=SAMPLE_STRUCTURE, headers=headers)

    response = client.post(f"/programs/{program['id']}/publish", json={}, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["version_number"] == "1.0"
    assert response.json()["status"] == "published"

    updated_program = client.get(f"/programs/{program['id']}", headers=headers).json()
    assert updated_program["is_published"] is True
    assert updated_program["current_version_id"] == response.json()["id"]

    # Теперь программа видна и в публичном каталоге.
    catalog = client.get("/programs/")
    assert program["id"] in [p["id"] for p in catalog.json()]


def test_second_publish_requires_changelog(client: TestClient):
    user = register_user(client)
    program = _create_program(client, user["token"])
    headers = auth_headers(user["token"])

    client.put(f"/programs/{program['id']}/draft", json=SAMPLE_STRUCTURE, headers=headers)
    client.post(f"/programs/{program['id']}/publish", json={}, headers=headers)

    # Второй публикации без changelog быть не должно (п.4 документа).
    response = client.post(f"/programs/{program['id']}/publish", json={}, headers=headers)
    assert response.status_code == 400

    response = client.post(
        f"/programs/{program['id']}/publish",
        json={"changelog": "Добавлен третий подход"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["version_number"] == "1.1"
    assert response.json()["changelog"] == "Добавлен третий подход"


def test_published_versions_are_immutable_and_history_is_listed(client: TestClient):
    user = register_user(client)
    program = _create_program(client, user["token"])
    headers = auth_headers(user["token"])

    client.put(f"/programs/{program['id']}/draft", json=SAMPLE_STRUCTURE, headers=headers)
    v1 = client.post(f"/programs/{program['id']}/publish", json={}, headers=headers).json()

    changed_structure = {
        "sections": [{"name": None, "schemes": [{"name": "Тренировка B", "blocks": []}]}]
    }
    client.put(f"/programs/{program['id']}/draft", json=changed_structure, headers=headers)
    v2 = client.post(
        f"/programs/{program['id']}/publish",
        json={"changelog": "Новая схема"},
        headers=headers,
    ).json()

    # Старая версия не поменялась вместе с новой публикацией.
    v1_again = client.get(f"/programs/{program['id']}/versions/{v1['id']}").json()
    assert v1_again["structure"]["sections"][0]["schemes"][0]["name"] == "Тренировка A"

    versions = client.get(f"/programs/{program['id']}/versions").json()
    assert [v["version_number"] for v in versions] == ["1.0", "1.1"]
    assert v2["version_number"] == "1.1"


def test_only_author_can_edit_or_publish(client: TestClient):
    author = register_user(client, "author")
    stranger = register_user(client, "stranger")

    program = _create_program(client, author["token"])
    stranger_headers = auth_headers(stranger["token"])

    assert client.put(
        f"/programs/{program['id']}/draft", json=SAMPLE_STRUCTURE, headers=stranger_headers
    ).status_code == 403

    assert client.post(
        f"/programs/{program['id']}/publish", json={}, headers=stranger_headers
    ).status_code == 403

    assert client.put(
        f"/programs/{program['id']}",
        json={"title": "Чужое название"},
        headers=stranger_headers,
    ).status_code == 403


def _make_admin(session, nickname: str) -> None:
    from sqlmodel import select

    from app.models import User

    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.is_admin = True
    session.add(user)
    session.commit()


def test_author_can_delete_published_program_and_diary_entries_are_detached(
    client: TestClient, session
):
    """
    Раньше опубликованную программу нельзя было удалить вовсе — теперь
    можно, но связанные записи дневника не должны сломаться: у них
    просто обнуляются program_id/program_version_id, а свободный текст
    (program_scheme) остаётся как есть.
    """
    user = register_user(client)
    program = _create_program(client, user["token"])
    headers = auth_headers(user["token"])

    client.put(f"/programs/{program['id']}/draft", json=SAMPLE_STRUCTURE, headers=headers)
    client.post(f"/programs/{program['id']}/publish", json={}, headers=headers)

    entry = client.post(
        "/diary/entries",
        json={
            "date": "2026-09-16",
            "title": "Тренировка",
            "description": "",
            "tags": [],
            "program_id": program["id"],
            "program_scheme": "Тренировка A",
        },
        headers=headers,
    ).json()
    assert entry["program_id"] == program["id"]
    assert entry["program_version_id"] is not None

    response = client.delete(f"/programs/{program['id']}", headers=headers)
    assert response.status_code == 204

    assert client.get(f"/programs/{program['id']}", headers=headers).status_code == 404

    updated_entry = client.get(f"/diary/entries/{entry['id']}", headers=headers).json()
    assert updated_entry["program_id"] is None
    assert updated_entry["program_version_id"] is None
    # Свободный текст схемы — не ссылка, поэтому не трогаем при удалении.
    assert updated_entry["program_scheme"] == "Тренировка A"


def test_stranger_cannot_delete_program_but_admin_can(client: TestClient, session):
    author = register_user(client, nickname="author")
    stranger = register_user(client, nickname="stranger")
    admin = register_user(client, nickname="admin")
    _make_admin(session, "admin")

    program = _create_program(client, author["token"])

    assert client.delete(
        f"/programs/{program['id']}", headers=auth_headers(stranger["token"])
    ).status_code == 403

    assert client.delete(
        f"/programs/{program['id']}", headers=auth_headers(admin["token"])
    ).status_code == 204


def test_favorite_is_independent_from_training_stats(client: TestClient):
    user = register_user(client)
    program = _create_program(client, user["token"])
    headers = auth_headers(user["token"])

    client.put(f"/programs/{program['id']}/draft", json=SAMPLE_STRUCTURE, headers=headers)
    client.post(f"/programs/{program['id']}/publish", json={}, headers=headers)

    client.post(f"/programs/{program['id']}/favorite", headers=headers)

    updated = client.get(f"/programs/{program['id']}", headers=headers).json()
    assert updated["favorites_count"] == 1
    assert updated["is_favorited_by_viewer"] is True
    # Добавление в избранное не считается тренировкой (п.9 документа).
    assert updated["trainings_count"] == 0


def test_diary_entry_fixes_program_version_at_creation_time(client: TestClient):
    user = register_user(client)
    program = _create_program(client, user["token"])
    headers = auth_headers(user["token"])

    client.put(f"/programs/{program['id']}/draft", json=SAMPLE_STRUCTURE, headers=headers)
    v1 = client.post(f"/programs/{program['id']}/publish", json={}, headers=headers).json()

    entry = client.post(
        "/diary/entries",
        json={
            "date": "2026-09-16",
            "title": "Тренировка",
            "description": "",
            "tags": [],
            "program_id": program["id"],
            "program_scheme": "Тренировка A",
        },
        headers=headers,
    ).json()
    assert entry["program_version_id"] == v1["id"]

    # Программа обновляется до v1.1 — старая запись должна остаться
    # привязанной именно к v1.0 (п.5-6 документа: "старая запись
    # дневника не должна автоматически переходить на новую версию").
    changed_structure = {
        "sections": [{"name": None, "schemes": [{"name": "Тренировка B", "blocks": []}]}]
    }
    client.put(f"/programs/{program['id']}/draft", json=changed_structure, headers=headers)
    client.post(
        f"/programs/{program['id']}/publish",
        json={"changelog": "Правки"},
        headers=headers,
    )

    entry_again = client.get(f"/diary/entries/{entry['id']}", headers=headers).json()
    assert entry_again["program_version_id"] == v1["id"]

    stats = client.get(f"/programs/{program['id']}", headers=headers).json()
    assert stats["trainings_count"] == 1


def test_cannot_link_diary_entry_to_unpublished_program(client: TestClient):
    user = register_user(client)
    program = _create_program(client, user["token"])
    headers = auth_headers(user["token"])

    response = client.post(
        "/diary/entries",
        json={
            "date": "2026-09-16",
            "title": "Тренировка",
            "description": "",
            "tags": [],
            "program_id": program["id"],
        },
        headers=headers,
    )
    assert response.status_code == 400


def test_repeated_use_counts_as_separate_trainings(client: TestClient):
    """п.7: одна и та же программа может использоваться много раз —
    каждая запись дневника с этой программой считается отдельно."""
    user = register_user(client)
    program = _create_program(client, user["token"])
    headers = auth_headers(user["token"])

    client.put(f"/programs/{program['id']}/draft", json=SAMPLE_STRUCTURE, headers=headers)
    client.post(f"/programs/{program['id']}/publish", json={}, headers=headers)

    for day in ("2026-09-10", "2026-09-12", "2026-09-15"):
        client.post(
            "/diary/entries",
            json={
                "date": day,
                "title": "Тренировка",
                "description": "",
                "tags": [],
                "program_id": program["id"],
            },
            headers=headers,
        )

    stats = client.get(f"/programs/{program['id']}", headers=headers).json()
    assert stats["trainings_count"] == 3


def test_comments_do_not_change_program_structure(client: TestClient):
    user = register_user(client)
    program = _create_program(client, user["token"])
    headers = auth_headers(user["token"])

    client.put(f"/programs/{program['id']}/draft", json=SAMPLE_STRUCTURE, headers=headers)
    client.post(f"/programs/{program['id']}/publish", json={}, headers=headers)

    comment = client.post(
        f"/programs/{program['id']}/comments",
        json={"text": "А можно заменить подтягивания?"},
        headers=headers,
    )
    assert comment.status_code == 200

    comments = client.get(f"/programs/{program['id']}/comments").json()
    assert len(comments) == 1
    assert comments[0]["text"] == "А можно заменить подтягивания?"


def test_delete_published_program_with_real_foreign_key_enforcement():
    """
    conftest.py даёт SQLite-базу без включённой проверки внешних
    ключей (PRAGMA foreign_keys не выставлен), поэтому обычный фикстурный
    `client` не отличает "ссылка обнулена/удалена в правильном порядке"
    от "просто осталась висеть на удалённую строку" — а именно так на
    практике дважды возникал баг при удалении опубликованной программы:
    сначала из-за необнулённого ProgramDB.current_version_id (тоже
    внешний ключ на programversion, не только у WorkoutEntry), потом
    из-за того, что DELETE FROM program выполнялся раньше DELETE FROM
    programfavorite/programcomment в рамках одного flush() при
    commit() — SQLAlchemy не гарантирует порядок нескольких DELETE без
    промежуточных flush() между зависимыми шагами. На PostgreSQL, где
    такие проверки включены всегда, оба раза удаление падало с 500.

    Этот тест поднимает отдельный SQLite-движок с явно включённым
    PRAGMA foreign_keys=ON — так он ведёт себя как настоящая
    PostgreSQL-база и реально проверяет порядок UPDATE/DELETE внутри
    delete_program (включая избранное и комментарий от другого
    пользователя), а не просто то, что финальное состояние верное.
    """
    import os

    from fastapi.testclient import TestClient
    from sqlalchemy import event
    from sqlmodel import Session, SQLModel, create_engine
    from sqlmodel.pool import StaticPool

    from app.database import get_session
    from app.main import app
    from app.models_complex import seed_complexes_if_empty

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    SQLModel.metadata.create_all(engine)

    with Session(engine) as setup_session:
        seed_complexes_if_empty(setup_session)
        setup_session.commit()

    session = Session(engine)
    app.dependency_overrides[get_session] = lambda: session

    try:
        with TestClient(app) as client:
            author = register_user(client, nickname="author")
            fan = register_user(client, nickname="fan")
            author_headers = auth_headers(author["token"])
            fan_headers = auth_headers(fan["token"])

            program = _create_program(client, author["token"])
            client.put(
                f"/programs/{program['id']}/draft",
                json=SAMPLE_STRUCTURE,
                headers=author_headers,
            )
            client.post(
                f"/programs/{program['id']}/publish", json={}, headers=author_headers
            )

            # Избранное и комментарий от другого пользователя — именно
            # эта комбинация раньше приводила к ForeignKeyViolation на
            # "programfavorite_program_id_fkey": DELETE FROM program
            # выполнялся раньше DELETE FROM programfavorite, потому что
            # без flush() между шагами SQLAlchemy не гарантирует, в
            # каком порядке применить несколько DELETE из одного commit().
            assert client.post(
                f"/programs/{program['id']}/favorite", headers=fan_headers
            ).status_code == 200
            assert client.post(
                f"/programs/{program['id']}/comments",
                json={"text": "Отличная программа!"},
                headers=fan_headers,
            ).status_code == 200

            entry = client.post(
                "/diary/entries",
                json={
                    "date": "2026-09-16",
                    "title": "Тренировка",
                    "description": "",
                    "tags": [],
                    "program_id": program["id"],
                    "program_scheme": "Тренировка A",
                },
                headers=author_headers,
            ).json()

            response = client.delete(
                f"/programs/{program['id']}", headers=author_headers
            )
            assert response.status_code == 204, response.text

            updated_entry = client.get(
                f"/diary/entries/{entry['id']}", headers=author_headers
            ).json()
            assert updated_entry["program_id"] is None
            assert updated_entry["program_version_id"] is None
            assert updated_entry["program_scheme"] == "Тренировка A"
    finally:
        app.dependency_overrides.pop(get_session, None)
        session.close()
