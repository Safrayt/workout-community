"""
Связь комплекса с упражнениями из базы упражнений (exercise_ids).

Администратор выбирает упражнения комплекса из базы, а не вводит
текстом. На этом строятся ссылки между страницей комплекса и страницами
упражнений и общая мышечная группа комплекса. Здесь — серверная часть:
проверка выбора, сборка текста из названий, защита удаляемого упражнения
и привязка стартового комплекса в уже существующей базе.
"""

import pytest
from sqlmodel import select

from app.database import _link_seed_complexes_to_exercises
from app.models import User
from conftest import auth_headers, register_user

# Упражнения из стартового набора (exercise_seed.json).
PULLUPS = "pullups-wide"
PUSHUPS = "pushups"
DIPS = "dips"

BASE_PAYLOAD = {
    "id": "linked-complex",
    "name": "Комплекс с упражнениями из базы",
    "types": ["circuit"],
    "description": "",
    "scheme_display": "3×10",
    "result_metrics": ["reps"],
}


@pytest.fixture(name="admin")
def admin_fixture(client, session):
    user = register_user(client, nickname="admin")
    row = session.exec(select(User).where(User.nickname == "admin")).first()
    row.is_admin = True
    session.add(row)
    session.commit()
    return auth_headers(user["token"])


def _create(client, admin, **overrides):
    return client.post(
        "/complexes/", json={**BASE_PAYLOAD, **overrides}, headers=admin
    )


def _exercise_name(client, exercise_id):
    return client.get(f"/exercises/{exercise_id}").json()["name"]


# --- Создание ------------------------------------------------------------


def test_complex_is_created_from_exercises_of_the_database(client, admin):
    response = _create(client, admin, exercise_ids=[PULLUPS, PUSHUPS, DIPS])

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["exercise_ids"] == [PULLUPS, PUSHUPS, DIPS]

    # Текст "Упражнение(я)" собран сервером из названий, в порядке выбора.
    names = [_exercise_name(client, i) for i in (PULLUPS, PUSHUPS, DIPS)]
    assert body["exercise"] == (
        f"1. {names[0]}  •  2. {names[1]}  •  3. {names[2]}"
    )


def test_single_exercise_text_is_just_its_name(client, admin):
    response = _create(client, admin, exercise_ids=[PUSHUPS])

    assert response.json()["exercise"] == _exercise_name(client, PUSHUPS)


def test_text_sent_by_client_is_ignored_when_exercises_are_chosen(client, admin):
    response = _create(
        client, admin, exercise_ids=[PUSHUPS], exercise="что-то своё"
    )

    assert response.json()["exercise"] == _exercise_name(client, PUSHUPS)


def test_order_of_exercises_is_kept(client, admin):
    _create(client, admin, exercise_ids=[DIPS, PULLUPS])

    stored = client.get("/complexes/linked-complex").json()

    assert stored["exercise_ids"] == [DIPS, PULLUPS]
    assert stored["exercise"].startswith(f"1. {_exercise_name(client, DIPS)}")


def test_unknown_exercise_is_rejected(client, admin):
    response = _create(client, admin, exercise_ids=[PUSHUPS, "no-such-exercise"])

    assert response.status_code == 422
    assert "no-such-exercise" in response.json()["detail"]
    assert client.get("/complexes/linked-complex").status_code == 404


def test_repeated_exercise_is_allowed(client, admin):
    """Одно упражнение может стоять в комплексе несколько раз, даже подряд."""
    response = _create(client, admin, exercise_ids=[PUSHUPS, PUSHUPS, PULLUPS])

    assert response.status_code == 200, response.text
    name = _exercise_name(client, PUSHUPS)
    assert response.json()["exercise"].startswith(f"1. {name}  •  2. {name}  •  3. ")


def test_complex_without_any_exercise_is_rejected(client, admin):
    response = _create(client, admin, exercise_ids=[], exercise="")

    assert response.status_code == 422
    assert "хотя бы одно упражнение" in response.json()["detail"]


def test_legacy_complex_with_text_only_still_works(client, admin):
    """Старый способ — только текст без привязки — по-прежнему принимается."""
    response = _create(client, admin, exercise="Подтягивания")

    assert response.status_code == 200, response.text
    assert response.json()["exercise_ids"] == []
    assert response.json()["exercise"] == "Подтягивания"


# --- Изменение -----------------------------------------------------------


def test_changing_exercises_updates_text(client, admin):
    _create(client, admin, exercise_ids=[PULLUPS])

    response = client.put(
        "/complexes/linked-complex",
        json={"exercise_ids": [PUSHUPS, DIPS]},
        headers=admin,
    )

    assert response.status_code == 200, response.text
    assert response.json()["exercise_ids"] == [PUSHUPS, DIPS]
    assert response.json()["exercise"].startswith("1. ")


def test_update_without_exercises_keeps_them(client, admin):
    _create(client, admin, exercise_ids=[PULLUPS, PUSHUPS])

    response = client.put(
        "/complexes/linked-complex", json={"name": "Новое имя"}, headers=admin
    )

    assert response.json()["exercise_ids"] == [PULLUPS, PUSHUPS]


def test_update_rejects_unknown_exercise_and_changes_nothing(client, admin):
    _create(client, admin, exercise_ids=[PULLUPS])

    response = client.put(
        "/complexes/linked-complex",
        json={"exercise_ids": ["no-such-exercise"]},
        headers=admin,
    )

    assert response.status_code == 422
    assert client.get("/complexes/linked-complex").json()["exercise_ids"] == [PULLUPS]


def test_existing_legacy_complex_can_be_linked_later(client, admin):
    _create(client, admin, exercise="Подтягивания")

    response = client.put(
        "/complexes/linked-complex",
        json={"exercise_ids": [PULLUPS]},
        headers=admin,
    )

    assert response.json()["exercise_ids"] == [PULLUPS]
    assert response.json()["exercise"] == _exercise_name(client, PULLUPS)


# --- Чтение --------------------------------------------------------------


def test_exercise_text_follows_renaming_of_exercise(client, admin):
    """Переименовали упражнение — в комплексе уже новое название."""
    _create(client, admin, exercise_ids=[PUSHUPS])
    exercise = client.get(f"/exercises/{PUSHUPS}").json()

    rename = client.put(
        f"/exercises/{PUSHUPS}",
        json={**_exercise_update_payload(exercise), "name": "Отжимания (новое имя)"},
        headers=admin,
    )
    assert rename.status_code == 200, rename.text

    assert client.get("/complexes/linked-complex").json()["exercise"] == (
        "Отжимания (новое имя)"
    )
    listed = {c["id"]: c for c in client.get("/complexes/").json()}
    assert listed["linked-complex"]["exercise"] == "Отжимания (новое имя)"


def _exercise_update_payload(exercise: dict) -> dict:
    keys = (
        "name", "name_en", "movement_type", "target_muscles",
        "auxiliary_muscles", "equipment", "description", "advantages",
        "disadvantages", "technique", "features", "suitable_for",
    )
    return {k: exercise[k] for k in keys if k in exercise}


def test_guest_sees_linked_exercises(client, admin):
    _create(client, admin, exercise_ids=[PULLUPS, PUSHUPS])

    response = client.get("/complexes/linked-complex")  # без токена

    assert response.status_code == 200
    assert response.json()["exercise_ids"] == [PULLUPS, PUSHUPS]


def test_seed_complex_is_linked_to_exercises(client):
    seed = client.get("/complexes/hannibal-scheme-steel").json()

    assert seed["exercise_ids"] == ["pullups-wide", "pushups", "pullups-reverse", "dips"]
    # Все они существуют в базе упражнений.
    for exercise_id in seed["exercise_ids"]:
        assert client.get(f"/exercises/{exercise_id}").status_code == 200


# --- Удаление упражнения -------------------------------------------------


def test_exercise_used_in_complex_cannot_be_deleted(client, admin):
    _create(client, admin, exercise_ids=[PUSHUPS], name="Мой комплекс")

    response = client.delete(f"/exercises/{PUSHUPS}", headers=admin)

    assert response.status_code == 409
    assert "Мой комплекс" in response.json()["detail"]
    assert client.get(f"/exercises/{PUSHUPS}").status_code == 200


def test_exercise_can_be_deleted_after_removed_from_complexes(client, admin):
    _create(client, admin, exercise_ids=[PUSHUPS, DIPS])
    client.put(
        "/complexes/linked-complex", json={"exercise_ids": [DIPS]}, headers=admin
    )
    # Стартовый комплекс Ганнибала тоже использует отжимания — убираем
    # их из его схемы (упражнения комплекса со схемой меняются схемой).
    client.put(
        "/complexes/hannibal-scheme-steel",
        json={
            "scheme": [
                {
                    "rounds": 11,
                    "items": [
                        {"exercise_id": "pullups-wide", "reps": 10},
                        {"exercise_id": "dips", "reps": 20},
                    ],
                }
            ]
        },
        headers=admin,
    )

    response = client.delete(f"/exercises/{PUSHUPS}", headers=admin)

    assert response.status_code == 204
    assert client.get(f"/exercises/{PUSHUPS}").status_code == 404


def test_unused_exercise_can_still_be_deleted(client, admin):
    response = client.delete("/exercises/calf-raise", headers=admin)

    assert response.status_code == 204


# --- Привязка стартового комплекса в существующей базе ----------------------


def test_seed_complex_is_linked_in_existing_database(client, session):
    """
    В базе, заведённой до появления связи, у «Схемы Ганнибала» нет
    привязки: при старте она появляется, второй запуск ничего не меняет.
    """
    connection = session.connection()
    connection.exec_driver_sql(
        "UPDATE complex SET exercise_ids = '[]', scheme = '[]' "
        "WHERE id = 'hannibal-scheme-steel'"
    )
    session.commit()
    before = client.get("/complexes/hannibal-scheme-steel").json()
    assert before["exercise_ids"] == [] and before["scheme"] == []

    engine = session.get_bind()

    with engine.connect() as connection:
        assert _link_seed_complexes_to_exercises(connection) == 1

    after = client.get("/complexes/hannibal-scheme-steel").json()
    assert len(after["exercise_ids"]) == 4
    assert after["scheme"][0]["rounds"] == 11

    with engine.connect() as connection:
        assert _link_seed_complexes_to_exercises(connection) == 0


def test_existing_scheme_of_admin_is_not_overwritten(client, session, admin):
    client.put(
        "/complexes/hannibal-scheme-steel",
        json={"scheme": [{"rounds": 3, "items": [{"exercise_id": PULLUPS, "reps": 5}]}]},
        headers=admin,
    )

    engine = session.get_bind()

    with engine.connect() as connection:
        assert _link_seed_complexes_to_exercises(connection) == 0

    stored = client.get("/complexes/hannibal-scheme-steel").json()
    assert stored["exercise_ids"] == [PULLUPS]
    assert stored["scheme"][0]["rounds"] == 3


def test_other_exercises_chosen_by_admin_are_not_overwritten(client, session):
    """Нет схемы, но администратор уже выбрал другие упражнения — не трогаем."""
    connection = session.connection()
    connection.exec_driver_sql(
        "UPDATE complex SET scheme = '[]', exercise_ids = '[\"pushups\"]' "
        "WHERE id = 'hannibal-scheme-steel'"
    )
    session.commit()

    engine = session.get_bind()

    with engine.connect() as connection:
        assert _link_seed_complexes_to_exercises(connection) == 0

    assert client.get("/complexes/hannibal-scheme-steel").json()["scheme"] == []


def test_seed_complex_is_not_linked_when_an_exercise_is_missing(client, session):
    """Нет какого-то нужного упражнения — привязку с дырой не делаем."""
    connection = session.connection()
    connection.exec_driver_sql(
        "UPDATE complex SET exercise_ids = '[]', scheme = '[]' "
        "WHERE id = 'hannibal-scheme-steel'"
    )
    connection.exec_driver_sql("DELETE FROM exercise WHERE id = 'dips'")
    session.commit()

    engine = session.get_bind()

    with engine.connect() as connection:
        assert _link_seed_complexes_to_exercises(connection) == 0

    assert client.get("/complexes/hannibal-scheme-steel").json()["exercise_ids"] == []
