"""
Тесты категории программы («публичная» / «личная»): значение по
умолчанию, выбор при создании и правке, фильтр каталога по категории
и миграция — все программы, созданные до появления категорий, становятся
личными, а выбор авторов при повторных стартах не сбрасывается.
"""

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import create_engine

from app import database
from tests.conftest import auth_headers, register_user


SAMPLE_STRUCTURE = {
    "sections": [
        {
            "name": None,
            "schemes": [
                {
                    "name": "Тренировка A",
                    "description": None,
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


def _create_program(client: TestClient, token: str, **overrides) -> dict:
    payload = {"title": "Сила на турниках", "description": "Базовая программа"}
    payload.update(overrides)

    response = client.post("/programs/", json=payload, headers=auth_headers(token))
    assert response.status_code == 200, response.text

    return response.json()


def _publish(client: TestClient, token: str, program_id: int) -> None:
    headers = auth_headers(token)

    client.put(f"/programs/{program_id}/draft", json=SAMPLE_STRUCTURE, headers=headers)

    response = client.post(f"/programs/{program_id}/publish", json={}, headers=headers)
    assert response.status_code == 200, response.text


def test_program_without_category_is_personal_by_default(client: TestClient):
    user = register_user(client)

    program = _create_program(client, user["token"])

    assert program["category"] == "personal"


def test_program_can_be_created_as_public(client: TestClient):
    user = register_user(client)

    program = _create_program(client, user["token"], category="public")

    assert program["category"] == "public"

    # Сохранилось именно в базе, а не только в ответе на создание.
    fetched = client.get(
        f"/programs/{program['id']}", headers=auth_headers(user["token"])
    )
    assert fetched.json()["category"] == "public"


def test_unknown_category_is_rejected(client: TestClient):
    user = register_user(client)

    response = client.post(
        "/programs/",
        json={"title": "Сила на турниках", "category": "secret"},
        headers=auth_headers(user["token"]),
    )

    assert response.status_code == 422


def test_author_can_change_category(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])
    program = _create_program(client, user["token"])

    to_public = client.put(
        f"/programs/{program['id']}", json={"category": "public"}, headers=headers
    )
    assert to_public.status_code == 200, to_public.text
    assert to_public.json()["category"] == "public"
    # Остальная информация о программе не затронута.
    assert to_public.json()["title"] == program["title"]

    back_to_personal = client.put(
        f"/programs/{program['id']}", json={"category": "personal"}, headers=headers
    )
    assert back_to_personal.json()["category"] == "personal"


def test_update_without_category_keeps_it(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])
    program = _create_program(client, user["token"], category="public")

    # Правка другого поля категорию не трогает.
    renamed = client.put(
        f"/programs/{program['id']}", json={"title": "Новое название"}, headers=headers
    )
    assert renamed.json()["category"] == "public"

    # Явный null — тоже «не менять»: категория обязательна.
    with_null = client.put(
        f"/programs/{program['id']}", json={"category": None}, headers=headers
    )
    assert with_null.status_code == 200, with_null.text
    assert with_null.json()["category"] == "public"


def test_stranger_cannot_change_category(client: TestClient):
    author = register_user(client, "author")
    stranger = register_user(client, "stranger")
    program = _create_program(client, author["token"])

    response = client.put(
        f"/programs/{program['id']}",
        json={"category": "public"},
        headers=auth_headers(stranger["token"]),
    )

    assert response.status_code in (403, 404)

    unchanged = client.get(
        f"/programs/{program['id']}", headers=auth_headers(author["token"])
    )
    assert unchanged.json()["category"] == "personal"


def test_catalog_can_be_filtered_by_category(client: TestClient):
    user = register_user(client)

    public_program = _create_program(
        client, user["token"], title="Для всех", category="public"
    )
    personal_program = _create_program(client, user["token"], title="Для себя")

    _publish(client, user["token"], public_program["id"])
    _publish(client, user["token"], personal_program["id"])

    everything = client.get("/programs/").json()
    assert {p["id"] for p in everything} == {
        public_program["id"],
        personal_program["id"],
    }

    only_public = client.get("/programs/?category=public").json()
    assert [p["id"] for p in only_public] == [public_program["id"]]

    only_personal = client.get("/programs/?category=personal").json()
    assert [p["id"] for p in only_personal] == [personal_program["id"]]

    assert client.get("/programs/?category=secret").status_code == 422


def test_my_programs_include_category(client: TestClient):
    user = register_user(client)
    _create_program(client, user["token"], title="Публичная", category="public")

    mine = client.get("/programs/mine", headers=auth_headers(user["token"]))

    assert [p["category"] for p in mine.json()] == ["public"]


def test_migration_makes_existing_programs_personal(monkeypatch):
    """
    На проде таблица program уже есть, а колонки category — нет. Старт
    приложения (_run_migrations) добавляет её, и все существующие
    программы становятся личными; повторный старт выбор авторов не
    сбрасывает.
    """
    legacy_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    with legacy_engine.begin() as connection:
        # Таблица в том виде, какой она была до категорий.
        connection.exec_driver_sql(
            "CREATE TABLE program ("
            "id INTEGER PRIMARY KEY, "
            "title VARCHAR NOT NULL, "
            "author_id INTEGER NOT NULL)"
        )
        connection.exec_driver_sql(
            "INSERT INTO program (id, title, author_id) "
            "VALUES (1, 'Старая A', 1), (2, 'Старая B', 1)"
        )

    monkeypatch.setattr(database, "engine", legacy_engine)

    def categories() -> dict[int, str]:
        with legacy_engine.connect() as connection:
            rows = connection.exec_driver_sql(
                "SELECT id, category FROM program"
            ).fetchall()

        return {row[0]: row[1] for row in rows}

    database._run_migrations()

    assert categories() == {1: "personal", 2: "personal"}

    # Автор решил, что его программа публичная; следующий старт
    # приложения этот выбор не трогает.
    with legacy_engine.begin() as connection:
        connection.exec_driver_sql(
            "UPDATE program SET category = 'public' WHERE id = 2"
        )

    database._run_migrations()

    assert categories() == {1: "personal", 2: "public"}
