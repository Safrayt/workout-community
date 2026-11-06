"""
Упражнения блоков программы: из базы упражнений (ссылкой) или своим
текстом, в порядке автора. Ссылки проверяются при сохранении черновика, а
упражнение, на которое ссылается программа, нельзя удалить.
"""

import pytest
from sqlmodel import select

from tests.conftest import auth_headers, register_user

PULLUPS = "pullups-wide"  # есть в стартовых данных
DIPS = "dips"


def _structure(items=None, **block_fields):
    block = {"title": "Блок 1", "scheme": "5x10", **block_fields}

    if items is not None:
        block["items"] = items

    return {
        "sections": [
            {
                "name": None,
                "schemes": [
                    {"name": "Тренировка A", "blocks": [block], "note": None}
                ],
            }
        ]
    }


def _create_program(client, token, title="Сила на турниках"):
    response = client.post(
        "/programs/",
        json={"title": title, "description": "Базовая программа"},
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text

    return response.json()


def _save_draft(client, token, program_id, structure):
    return client.put(
        f"/programs/{program_id}/draft",
        json=structure,
        headers=auth_headers(token),
    )


def _draft_blocks(client, token, program_id):
    draft = client.get(
        f"/programs/{program_id}/draft", headers=auth_headers(token)
    ).json()

    return draft["structure"]["sections"][0]["schemes"][0]["blocks"]


@pytest.fixture(name="author")
def author_fixture(client):
    return register_user(client, "program_author")


def test_items_keep_their_order_and_kinds(client, author):
    program = _create_program(client, author["token"])
    items = [
        {"exercise_id": PULLUPS},
        {"text": "Ходьба на руках"},
        {"exercise_id": DIPS},
    ]

    response = _save_draft(
        client, author["token"], program["id"], _structure(items)
    )

    assert response.status_code == 200, response.text

    saved = _draft_blocks(client, author["token"], program["id"])[0]["items"]
    assert saved == [
        {"exercise_id": PULLUPS, "text": None, "load": None},
        {"exercise_id": None, "text": "Ходьба на руках", "load": None},
        {"exercise_id": DIPS, "text": None, "load": None},
    ]


def test_load_is_saved_for_both_kinds_of_exercises(client, author):
    program = _create_program(client, author["token"])
    items = [
        {"exercise_id": PULLUPS, "load": "  80% от максимума "},
        {"text": "Ходьба на руках", "load": "30 секунд"},
        {"exercise_id": DIPS},
    ]

    response = _save_draft(
        client, author["token"], program["id"], _structure(items)
    )

    assert response.status_code == 200, response.text

    saved = _draft_blocks(client, author["token"], program["id"])[0]["items"]
    assert [item["load"] for item in saved] == [
        "80% от максимума",
        "30 секунд",
        None,
    ]


def test_blank_load_means_no_load(client, author):
    program = _create_program(client, author["token"])

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([{"exercise_id": PULLUPS, "load": "   "}]),
    )

    assert response.status_code == 200, response.text

    saved = _draft_blocks(client, author["token"], program["id"])[0]["items"]
    assert saved[0]["load"] is None


def test_too_long_load_is_rejected(client, author):
    program = _create_program(client, author["token"])

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([{"exercise_id": PULLUPS, "load": "я" * 101}]),
    )

    assert response.status_code == 422


def test_load_alone_is_not_an_exercise(client, author):
    program = _create_program(client, author["token"])

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([{"load": "максимум"}]),
    )

    assert response.status_code == 422


def test_same_exercise_can_repeat_in_a_block(client, author):
    program = _create_program(client, author["token"])
    items = [{"exercise_id": PULLUPS}, {"exercise_id": DIPS}, {"exercise_id": PULLUPS}]

    response = _save_draft(
        client, author["token"], program["id"], _structure(items)
    )

    assert response.status_code == 200, response.text


def test_legacy_text_exercises_are_still_accepted(client, author):
    program = _create_program(client, author["token"])
    structure = _structure(exercises=["Подтягивания", "Отжимания"])

    response = _save_draft(client, author["token"], program["id"], structure)

    assert response.status_code == 200, response.text

    block = _draft_blocks(client, author["token"], program["id"])[0]
    assert block["exercises"] == ["Подтягивания", "Отжимания"]
    assert block["items"] == []


def test_unknown_exercise_is_rejected(client, author):
    program = _create_program(client, author["token"])

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([{"exercise_id": "no-such-exercise"}]),
    )

    assert response.status_code == 422
    assert "no-such-exercise" in response.text


@pytest.mark.parametrize(
    "item",
    [
        {},
        {"text": "   "},
        {"exercise_id": PULLUPS, "text": "и то и другое"},
        {"text": "я" * 201},
    ],
)
def test_invalid_item_is_rejected(client, author, item):
    program = _create_program(client, author["token"])

    response = _save_draft(
        client, author["token"], program["id"], _structure([item])
    )

    assert response.status_code == 422


def test_item_values_are_trimmed(client, author):
    program = _create_program(client, author["token"])

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([{"text": "  Ходьба на руках  "}]),
    )

    saved = _draft_blocks(client, author["token"], program["id"])[0]["items"]
    assert saved[0]["text"] == "Ходьба на руках"


def test_structure_exercise_ids_collects_unique_ids_in_order():
    from app.models_program import structure_exercise_ids

    structure = {
        "sections": [
            {
                "schemes": [
                    {
                        "blocks": [
                            {"items": [{"exercise_id": "a"}, {"text": "x"}]},
                            {"items": [{"exercise_id": "b"}, {"exercise_id": "a"}]},
                            {"exercises": ["старое"]},
                        ]
                    }
                ]
            },
            {"schemes": []},
        ]
    }

    assert structure_exercise_ids(structure) == ["a", "b"]
    assert structure_exercise_ids(None) == []
    assert structure_exercise_ids({}) == []


# --- Удаление упражнения, на которое ссылается программа --------------------


@pytest.fixture(name="admin")
def admin_fixture(client, session):
    from app.models import User

    user = register_user(client, "exercise_admin")
    db_user = session.exec(
        select(User).where(User.nickname == "exercise_admin")
    ).first()
    db_user.is_admin = True
    session.add(db_user)
    session.commit()

    return user


def test_exercise_used_in_a_program_cannot_be_deleted(client, author, admin):
    program = _create_program(client, author["token"], title="Моя программа")
    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([{"exercise_id": "squats"}]),
    )

    response = client.delete(
        "/exercises/squats", headers=auth_headers(admin["token"])
    )

    assert response.status_code == 409
    assert "Моя программа" in response.text


def test_exercise_can_be_deleted_after_it_is_removed_from_the_program(
    client, author, admin
):
    program = _create_program(client, author["token"])
    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([{"exercise_id": "squats"}]),
    )
    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([{"exercise_id": PULLUPS}]),
    )

    response = client.delete(
        "/exercises/squats", headers=auth_headers(admin["token"])
    )

    assert response.status_code == 204, response.text
