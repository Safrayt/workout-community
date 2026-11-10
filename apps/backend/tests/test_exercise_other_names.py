"""
Другие названия упражнения (синонимы): список, который задаёт
администратор. Сервер наводит в нём порядок — убирает лишние пробелы,
пустые строки и повторы, а также названия, которые совпадают с основным
или английским, — и не принимает слишком длинные и слишком многочисленные.
"""

import pytest
from sqlmodel import select

from app.models_exercise import MAX_NAME_LENGTH, MAX_OTHER_NAMES
from tests.conftest import auth_headers, register_user

PAYLOAD = {
    "name": "Подтягивания узким хватом",
    "name_en": "Close Grip Pull-Ups",
    "movement_type": "pull",
    "target_muscles": ["lats"],
    "equipment": ["rings"],
    "description": "Описание.",
    "technique": ["Шаг первый"],
}


@pytest.fixture(name="admin")
def admin_fixture(client, session):
    from app.models import User

    user = register_user(client, "other_names_admin")
    db_user = session.exec(
        select(User).where(User.nickname == "other_names_admin")
    ).first()
    db_user.is_admin = True
    session.add(db_user)
    session.commit()

    return auth_headers(user["token"])


def _create(client, admin, **overrides):
    return client.post(
        "/exercises/", json={**PAYLOAD, **overrides}, headers=admin
    )


def _update(client, admin, exercise_id, **overrides):
    return client.put(
        f"/exercises/{exercise_id}",
        json={**PAYLOAD, **overrides},
        headers=admin,
    )


def test_other_names_default_to_empty(client, admin):
    response = _create(client, admin)

    assert response.status_code == 201, response.text
    assert response.json()["other_names"] == []


def test_other_names_are_saved_in_order(client, admin):
    names = ["Узкие подтягивания", "Close-grip chin-ups", "Подтягивания к груди"]

    created = _create(client, admin, other_names=names).json()

    assert created["other_names"] == names

    # И при повторном чтении из базы — тот же порядок.
    fetched = client.get(f"/exercises/{created['id']}").json()

    assert fetched["other_names"] == names


def test_other_names_are_cleaned(client, admin):
    created = _create(
        client,
        admin,
        other_names=[
            "  Тяга   к груди ",
            "",
            "   ",
            "тяга к груди",  # повтор без учёта регистра
            "Подтягивания",
            "ПОДТЯГИВАНИЯ",
        ],
    ).json()

    assert created["other_names"] == ["Тяга к груди", "Подтягивания"]


def test_yo_and_ye_are_the_same_name(client, admin):
    created = _create(
        client, admin, other_names=["Тяга в наклоне ещё", "тяга в наклоне еще"]
    ).json()

    assert created["other_names"] == ["Тяга в наклоне ещё"]


def test_names_repeating_main_ones_are_dropped(client, admin):
    created = _create(
        client,
        admin,
        other_names=[
            "подтягивания узким хватом",
            "CLOSE GRIP PULL-UPS",
            "Подтягивания с узким хватом",
        ],
    ).json()

    assert created["other_names"] == ["Подтягивания с узким хватом"]


def test_too_many_other_names_are_rejected(client, admin):
    names = [f"Название {number}" for number in range(MAX_OTHER_NAMES + 1)]

    response = _create(client, admin, other_names=names)

    assert response.status_code == 422


def test_limit_counts_names_after_cleanup(client, admin):
    # Одиннадцать строк, но уникальных названий ровно десять.
    names = [f"Название {number}" for number in range(MAX_OTHER_NAMES)]

    response = _create(client, admin, other_names=[*names, "  название 0 "])

    assert response.status_code == 201, response.text
    assert response.json()["other_names"] == names


def test_too_long_other_name_is_rejected(client, admin):
    response = _create(
        client, admin, other_names=["а" * (MAX_NAME_LENGTH + 1)]
    )

    assert response.status_code == 422


def test_update_replaces_and_clears_other_names(client, admin):
    created = _create(client, admin, other_names=["Узкие подтягивания"]).json()

    updated = _update(
        client, admin, created["id"], other_names=["Подтягивания к груди"]
    ).json()

    assert updated["other_names"] == ["Подтягивания к груди"]

    cleared = _update(client, admin, created["id"], other_names=[]).json()

    assert cleared["other_names"] == []

