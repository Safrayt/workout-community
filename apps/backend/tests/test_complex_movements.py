"""
Тип движения комплекса.

Раньше администратор выбирал для комплекса «Тяга / Жим / Ноги» вручную.
Теперь тип комплекса — это типы движения упражнений его схемы
(«Тяговые», «Жимовые», «Отведения», «Скручивания», «Колено-доминантные»,
«Тазо-доминантные», «Разгибание стопы»): сервер выводит их сам.
"""

import pytest
from sqlmodel import select

from app.database import _refresh_complex_movements
from app.models import User
from conftest import auth_headers, register_user

# Упражнения из стартового набора (exercise_seed.json) и их типы движения.
PULLUPS = "pullups-wide"  # pull
PUSHUPS = "pushups"  # push
SQUATS = "squats"  # kneeDominant
CALF_RAISE = "calf-raise"  # ankleExtension

BASE_PAYLOAD = {
    "id": "movements-complex",
    "name": "Комплекс для проверки типов движения",
    "types": ["circuit"],
    "description": "",
    "result_metrics": ["reps"],
}


def _scheme(*exercise_ids):
    return [
        {
            "rounds": 3,
            "items": [{"exercise_id": exercise_id, "reps": 5} for exercise_id in exercise_ids],
        }
    ]


@pytest.fixture(name="admin")
def admin_fixture(client, session):
    user = register_user(client, nickname="admin")
    row = session.exec(select(User).where(User.nickname == "admin")).first()
    row.is_admin = True
    session.add(row)
    session.commit()
    return auth_headers(user["token"])


def _create(client, admin, scheme, **overrides):
    return client.post(
        "/complexes/",
        json={**BASE_PAYLOAD, "scheme": scheme, **overrides},
        headers=admin,
    )


def test_movements_are_taken_from_exercises_of_the_scheme(client, admin):
    response = _create(client, admin, _scheme(PULLUPS, PUSHUPS, SQUATS))

    assert response.status_code == 200, response.text
    assert response.json()["movements"] == ["pull", "push", "kneeDominant"]
    assert client.get("/complexes/movements-complex").json()["movements"] == [
        "pull",
        "push",
        "kneeDominant",
    ]


def test_movements_have_no_repeats_and_keep_scheme_order(client, admin):
    response = _create(
        client, admin, _scheme(CALF_RAISE, PUSHUPS, CALF_RAISE, PUSHUPS, PULLUPS)
    )

    assert response.json()["movements"] == ["ankleExtension", "push", "pull"]


def test_movements_sent_by_client_are_ignored(client, admin):
    """Клиент больше не задаёт тип движения — присланное не учитывается."""
    response = _create(
        client, admin, _scheme(PUSHUPS), movements=["pull", "legs", "whatever"]
    )

    assert response.status_code == 200, response.text
    assert response.json()["movements"] == ["push"]


def test_movements_follow_exercises_without_scheme(client, admin):
    """Комплекс со списком упражнений (без схемы) тоже получает типы."""
    response = client.post(
        "/complexes/",
        json={**BASE_PAYLOAD, "exercise_ids": [SQUATS, PULLUPS]},
        headers=admin,
    )

    assert response.status_code == 200, response.text
    assert response.json()["movements"] == ["kneeDominant", "pull"]


def test_changing_the_scheme_changes_movements(client, admin):
    _create(client, admin, _scheme(PULLUPS))

    response = client.put(
        "/complexes/movements-complex",
        json={"scheme": _scheme(PUSHUPS, CALF_RAISE)},
        headers=admin,
    )

    assert response.status_code == 200, response.text
    assert response.json()["movements"] == ["push", "ankleExtension"]


def test_editing_other_fields_keeps_movements(client, admin):
    _create(client, admin, _scheme(PULLUPS, PUSHUPS))

    response = client.put(
        "/complexes/movements-complex", json={"name": "Другое имя"}, headers=admin
    )

    assert response.json()["movements"] == ["pull", "push"]


def test_changing_exercise_movement_type_is_reflected_in_complex(
    client, session, admin
):
    """Сменили тип движения упражнения — комплекс с ним показывает новый."""
    _create(client, admin, _scheme(PUSHUPS))

    session.connection().exec_driver_sql(
        "UPDATE exercise SET movement_type = 'crunch' WHERE id = 'pushups'"
    )
    session.commit()

    assert client.get("/complexes/movements-complex").json()["movements"] == ["crunch"]
    catalog = client.get("/complexes/").json()
    assert next(c for c in catalog if c["id"] == "movements-complex")["movements"] == [
        "crunch"
    ]


def test_seed_complex_has_new_movement_types(client):
    seed = client.get("/complexes/hannibal-scheme-steel").json()

    assert seed["movements"] == ["pull", "push"]


def test_legacy_stored_movements_do_not_break_the_catalog(client, session):
    """
    Комплекс без упражнений из базы со старой классификацией («press»,
    «legs») читается: «press» → «push», «legs» отбрасывается.
    """
    connection = session.connection()
    connection.exec_driver_sql(
        "UPDATE complex SET scheme = '[]', exercise_ids = '[]', "
        "movements = '[\"pull\", \"press\", \"legs\"]' "
        "WHERE id = 'hannibal-scheme-steel'"
    )
    session.commit()

    response = client.get("/complexes/hannibal-scheme-steel")

    assert response.status_code == 200, response.text
    assert response.json()["movements"] == ["pull", "push"]
    assert client.get("/complexes/").status_code == 200


def test_migration_recomputes_movements_from_exercises(client, session):
    connection = session.connection()
    connection.exec_driver_sql(
        "UPDATE complex SET movements = '[\"pull\", \"press\", \"legs\"]' "
        "WHERE id = 'hannibal-scheme-steel'"
    )
    session.commit()

    engine = session.get_bind()

    with engine.connect() as db:
        assert _refresh_complex_movements(db) == 1

    with engine.connect() as db:
        stored = db.exec_driver_sql(
            "SELECT movements FROM complex WHERE id = 'hannibal-scheme-steel'"
        ).scalar()
        # Повторный запуск ничего не меняет.
        assert _refresh_complex_movements(db) == 0

    assert stored in ('["pull", "push"]', '["pull","push"]')


def test_migration_converts_legacy_values_of_complex_without_exercises(
    client, session
):
    connection = session.connection()
    connection.exec_driver_sql(
        "UPDATE complex SET scheme = '[]', exercise_ids = '[]', "
        "movements = '[\"press\", \"legs\"]' WHERE id = 'hannibal-scheme-steel'"
    )
    session.commit()

    engine = session.get_bind()

    with engine.connect() as db:
        assert _refresh_complex_movements(db) == 1
        stored = db.exec_driver_sql(
            "SELECT movements FROM complex WHERE id = 'hannibal-scheme-steel'"
        ).scalar()

    assert stored in ('["push"]',)
