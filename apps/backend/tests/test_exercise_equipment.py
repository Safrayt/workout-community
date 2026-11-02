"""
Оборудование упражнений: ключи из справочника (те же, что у оборудования
площадок, плюс универсальное — вертикальный столб) и отметка «Без
оборудования». Старые текстовые значения при переходе на этот формат
один раз сбрасываются (database._reset_exercise_equipment).
"""

from typing import get_args

import pytest
from sqlalchemy import create_engine, text
from sqlmodel import select

from conftest import auth_headers, register_user

PAYLOAD = {
    "name": "Упражнение для проверки оборудования",
    "movement_type": "pull",
    "target_muscles": ["lats"],
    "description": "Описание.",
    "technique": ["Шаг первый"],
}


@pytest.fixture(name="admin")
def admin_fixture(client, session):
    from app.models import User

    user = register_user(client, nickname="equipment_admin")
    db_user = session.exec(
        select(User).where(User.nickname == "equipment_admin")
    ).first()
    db_user.is_admin = True
    session.add(db_user)
    session.commit()

    return auth_headers(user["token"])


def _create(client, admin, **overrides):
    return client.post(
        "/exercises/", json={**PAYLOAD, **overrides}, headers=admin
    )


def test_equipment_keys_are_playground_equipment_plus_universal():
    from app.models_exercise import UNIVERSAL_EQUIPMENT, ExerciseEquipment
    from app.models_playground import PlaygroundEquipment

    expected = {item.value for item in PlaygroundEquipment} | set(
        UNIVERSAL_EQUIPMENT
    )

    assert set(get_args(ExerciseEquipment)) == expected


def test_exercise_with_equipment_is_created(client, admin):
    response = _create(client, admin, equipment=["rings", "lowPushBar"])

    assert response.status_code == 201, response.text
    created = response.json()
    assert created["equipment"] == ["rings", "lowPushBar"]
    assert created["no_equipment"] is False


def test_exercise_without_equipment_is_created(client, admin):
    response = _create(client, admin, equipment=[], no_equipment=True)

    assert response.status_code == 201, response.text
    created = response.json()
    assert created["equipment"] == []
    assert created["no_equipment"] is True


def test_universal_equipment_is_accepted(client, admin):
    response = _create(client, admin, equipment=["verticalPost"])

    assert response.status_code == 201, response.text
    assert response.json()["equipment"] == ["verticalPost"]


def test_exercise_needs_equipment_or_no_equipment_mark(client, admin):
    response = _create(client, admin, equipment=[], no_equipment=False)

    assert response.status_code == 422


def test_equipment_and_no_equipment_cannot_be_combined(client, admin):
    response = _create(client, admin, equipment=["rings"], no_equipment=True)

    assert response.status_code == 422


def test_every_seed_exercise_has_equipment_choice():
    from app.models_exercise import load_seed_exercises

    for seed in load_seed_exercises():
        assert seed["no_equipment"] or seed["equipment"], seed["id"]
        assert not (seed["no_equipment"] and seed["equipment"]), seed["id"]


# --- Разовый сброс старых значений ---------------------------------------


def _old_exercise_table():
    """База «до обновления»: оборудование — текст, колонки no_equipment нет."""
    engine = create_engine("sqlite://")

    with engine.connect() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE exercise (id TEXT PRIMARY KEY, equipment JSON)"
        )
        connection.exec_driver_sql(
            "INSERT INTO exercise (id, equipment) VALUES "
            "('a', '[\"Турник\"]'), ('b', '[\"Без оборудования\"]')"
        )
        connection.commit()

    return engine


def test_old_equipment_is_cleared_once():
    from app.database import _reset_exercise_equipment

    engine = _old_exercise_table()
    ddl = "BOOLEAN DEFAULT 0"

    with engine.connect() as connection:
        assert _reset_exercise_equipment(connection, ddl) == 2

        rows = connection.execute(
            text("SELECT id, equipment, no_equipment FROM exercise ORDER BY id")
        ).all()
        assert [(r[0], r[1], r[2]) for r in rows] == [
            ("a", "[]", 0),
            ("b", "[]", 0),
        ]

        # Администратор расставил оборудование заново — повторный запуск
        # (перезапуск сервера) его затирать не должен.
        connection.execute(
            text(
                "UPDATE exercise SET equipment = '[\"rings\"]' WHERE id = 'a'"
            )
        )
        connection.commit()

        assert _reset_exercise_equipment(connection, ddl) == 0
        assert (
            connection.execute(
                text("SELECT equipment FROM exercise WHERE id = 'a'")
            ).scalar()
            == '["rings"]'
        )
