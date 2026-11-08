"""
Менее сложные и более сложные упражнения: ссылки на другие упражнения
базы, которые задаёт администратор. Они должны существовать, не указывать
на само упражнение и не пересекаться между списками; упражнение, на
которое ссылаются, нельзя удалить.
"""

import pytest
from sqlmodel import select

from tests.conftest import auth_headers, register_user

PAYLOAD = {
    "name": "Упражнение для проверки связей",
    "movement_type": "pull",
    "target_muscles": ["lats"],
    "equipment": ["rings"],
    "description": "Описание.",
    "technique": ["Шаг первый"],
}

# Есть в стартовых данных.
EASIER = "pullups-reverse"
HARDER = "pullups-wide"
OTHER = "pushups"


@pytest.fixture(name="admin")
def admin_fixture(client, session):
    from app.models import User

    user = register_user(client, "progressions_admin")
    db_user = session.exec(
        select(User).where(User.nickname == "progressions_admin")
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


def test_exercise_without_related_exercises(client, admin):
    response = _create(client, admin)

    assert response.status_code == 201, response.text
    created = response.json()
    assert created["easier_exercise_ids"] == []
    assert created["harder_exercise_ids"] == []


def test_related_exercises_are_saved_in_order(client, admin):
    response = _create(
        client,
        admin,
        easier_exercise_ids=[EASIER, OTHER],
        harder_exercise_ids=[HARDER],
    )

    assert response.status_code == 201, response.text
    created = response.json()
    assert created["easier_exercise_ids"] == [EASIER, OTHER]
    assert created["harder_exercise_ids"] == [HARDER]

    fetched = client.get(f"/exercises/{created['id']}").json()
    assert fetched["easier_exercise_ids"] == [EASIER, OTHER]
    assert fetched["harder_exercise_ids"] == [HARDER]


def test_duplicates_and_blanks_are_removed(client, admin):
    response = _create(
        client,
        admin,
        easier_exercise_ids=[EASIER, "  ", EASIER],
    )

    assert response.status_code == 201, response.text
    assert response.json()["easier_exercise_ids"] == [EASIER]


def test_unknown_exercise_is_rejected(client, admin):
    response = _create(
        client, admin, harder_exercise_ids=["no-such-exercise"]
    )

    assert response.status_code == 422
    assert "no-such-exercise" in response.text


def test_same_exercise_in_both_lists_is_rejected(client, admin):
    response = _create(
        client,
        admin,
        easier_exercise_ids=[EASIER],
        harder_exercise_ids=[EASIER],
    )

    assert response.status_code == 422


def test_too_many_related_exercises_are_rejected(client, admin):
    response = _create(
        client,
        admin,
        easier_exercise_ids=[f"exercise-{index}" for index in range(11)],
    )

    assert response.status_code == 422


def test_exercise_cannot_reference_itself(client, admin):
    created = _create(client, admin).json()

    response = _update(
        client,
        admin,
        created["id"],
        harder_exercise_ids=[created["id"]],
    )

    assert response.status_code == 422


def test_related_exercises_can_be_changed_and_cleared(client, admin):
    created = _create(client, admin, easier_exercise_ids=[EASIER]).json()

    response = _update(
        client, admin, created["id"], harder_exercise_ids=[HARDER]
    )
    assert response.status_code == 200, response.text
    assert response.json()["easier_exercise_ids"] == []
    assert response.json()["harder_exercise_ids"] == [HARDER]

    response = _update(client, admin, created["id"])
    assert response.status_code == 200, response.text
    assert response.json()["harder_exercise_ids"] == []


def test_referenced_exercise_cannot_be_deleted(client, admin):
    easier = _create(client, admin, name="Лёгкий вариант").json()
    _create(
        client,
        admin,
        name="Основное упражнение",
        easier_exercise_ids=[easier["id"]],
    )

    response = client.delete(f"/exercises/{easier['id']}", headers=admin)

    assert response.status_code == 409
    assert "Основное упражнение" in response.text


def test_exercise_can_be_deleted_after_the_link_is_removed(client, admin):
    easier = _create(client, admin, name="Лёгкий вариант").json()
    main = _create(
        client,
        admin,
        name="Основное упражнение",
        easier_exercise_ids=[easier["id"]],
    ).json()

    _update(client, admin, main["id"], name="Основное упражнение")

    response = client.delete(f"/exercises/{easier['id']}", headers=admin)

    assert response.status_code == 204, response.text
