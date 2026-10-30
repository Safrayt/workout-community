"""
Структурированная схема комплекса (Complex.scheme).

Схема — список блоков, блок — повторяющаяся группа упражнений из базы
упражнений. Одной моделью описываются интервалы («3 минуты на максимум»),
круговые схемы с прогрессией («Схема Ганнибала»), подходы и несколько
отдельных суперсетов. Здесь — серверная часть: сохранение, правила
проверки и производные поля (список упражнений, текст «Упражнение(я)»).
"""

import pytest
from sqlmodel import select

from app.models import User
from conftest import auth_headers, register_user

PULLUPS = "pullups-wide"
PUSHUPS = "pushups"
SQUATS = "squats"


@pytest.fixture(name="admin")
def admin_fixture(client, session):
    user = register_user(client, nickname="admin")
    row = session.exec(select(User).where(User.nickname == "admin")).first()
    row.is_admin = True
    session.add(row)
    session.commit()
    return auth_headers(user["token"])


def _payload(scheme, **overrides):
    return {
        "id": "scheme-complex",
        "name": "Комплекс со схемой",
        "types": ["interval"],
        "description": "",
        "result_metrics": ["reps"],
        "scheme": scheme,
        **overrides,
    }


def _create(client, admin, scheme, **overrides):
    return client.post("/complexes/", json=_payload(scheme, **overrides), headers=admin)


def _name(client, exercise_id):
    return client.get(f"/exercises/{exercise_id}").json()["name"]


def _max_for_a_minute(exercise_id):
    return {"exercise_id": exercise_id, "max_effort": True, "duration_seconds": 60}


# --- Пример «3 минуты на максимум» ------------------------------------------


def test_interval_complex_from_the_example(client, admin):
    """Три упражнения по минуте на максимум — один блок, один раз."""
    response = _create(
        client,
        admin,
        [{"items": [_max_for_a_minute(i) for i in (PULLUPS, PUSHUPS, SQUATS)]}],
        scheme_note="Отдыхать внутри минуты можно, но время не останавливается.",
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["types"] == ["interval"]
    assert body["scheme_note"].startswith("Отдыхать внутри минуты")

    block = body["scheme"][0]
    assert block["rounds"] == 1
    assert [item["exercise_id"] for item in block["items"]] == [PULLUPS, PUSHUPS, SQUATS]
    assert all(
        item["max_effort"] and item["duration_seconds"] == 60 for item in block["items"]
    )

    names = [_name(client, i) for i in (PULLUPS, PUSHUPS, SQUATS)]
    assert body["exercise"] == f"1. {names[0]}  •  2. {names[1]}  •  3. {names[2]}"


def test_scheme_display_text_is_no_longer_required(client, admin):
    response = _create(client, admin, [{"items": [_max_for_a_minute(PULLUPS)]}])

    assert response.status_code == 200, response.text


# --- Повторы упражнений -------------------------------------------------------


def test_same_exercise_can_be_repeated_in_a_row(client, admin):
    scheme = [{"items": [{"exercise_id": PULLUPS, "reps": 10}] * 3}]

    response = _create(client, admin, scheme)

    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["scheme"][0]["items"]) == 3
    name = _name(client, PULLUPS)
    assert body["exercise"] == f"1. {name}  •  2. {name}  •  3. {name}"


def test_derived_exercise_ids_are_distinct_in_order_of_first_appearance(client, admin):
    scheme = [
        {
            "items": [
                {"exercise_id": PULLUPS, "reps": 5},
                {"exercise_id": PUSHUPS, "reps": 5},
                {"exercise_id": PULLUPS, "reps": 5},
            ]
        }
    ]

    body = _create(client, admin, scheme).json()

    assert body["exercise_ids"] == [PULLUPS, PUSHUPS]


# --- Круги, подходы, суперсеты ----------------------------------------------------


def test_circuit_with_rounds_and_rests(client, admin):
    scheme = [
        {
            "rounds": 5,
            "rounds_kind": "rounds",
            "rest_between_items_seconds": 15,
            "rest_between_rounds_seconds": 90,
            "items": [
                {"exercise_id": PULLUPS, "reps": 8},
                {"exercise_id": PUSHUPS, "reps": 15},
            ],
        }
    ]

    block = _create(client, admin, scheme, types=["circuit"]).json()["scheme"][0]

    assert (block["rounds"], block["rounds_kind"]) == (5, "rounds")
    assert block["rest_between_items_seconds"] == 15
    assert block["rest_between_rounds_seconds"] == 90


def test_several_separate_supersets(client, admin):
    scheme = [
        {
            "title": "Суперсет 1",
            "rounds": 3,
            "rounds_kind": "sets",
            "items": [
                {"exercise_id": PULLUPS, "reps": 8},
                {"exercise_id": PUSHUPS, "reps": 12},
            ],
        },
        {
            "title": "Суперсет 2",
            "rounds": 3,
            "rounds_kind": "sets",
            "items": [
                {"exercise_id": SQUATS, "reps": 15},
                {"exercise_id": PUSHUPS, "reps": 10},
            ],
        },
    ]

    body = _create(client, admin, scheme, types=["superset"]).json()

    assert [b["title"] for b in body["scheme"]] == ["Суперсет 1", "Суперсет 2"]
    assert body["exercise_ids"] == [PULLUPS, PUSHUPS, SQUATS]


def test_progression_per_round_is_stored(client, admin):
    scheme = [
        {
            "rounds": 11,
            "items": [
                {"exercise_id": PULLUPS, "reps": 10, "reps_step": -1, "reps_limit": 5},
                {"exercise_id": PUSHUPS, "reps": 30, "reps_step": -1},
            ],
        }
    ]

    first, second = _create(client, admin, scheme, types=["ladder"]).json()["scheme"][0]["items"]

    assert (first["reps_step"], first["reps_limit"]) == (-1, 5)
    assert (second["reps_step"], second["reps_limit"]) == (-1, None)


def test_amrap_block_with_time_limit(client, admin):
    scheme = [
        {
            "rounds": None,
            "time_limit_seconds": 600,
            "items": [
                {"exercise_id": PULLUPS, "reps": 5},
                {"exercise_id": PUSHUPS, "reps": 10},
            ],
        }
    ]

    response = _create(client, admin, scheme, types=["amrap"])

    assert response.status_code == 200, response.text
    block = response.json()["scheme"][0]
    assert block["rounds"] is None and block["time_limit_seconds"] == 600


def test_hold_and_reps_within_time_combinations(client, admin):
    scheme = [
        {
            "items": [
                {"exercise_id": PULLUPS, "duration_seconds": 30},  # удержание
                {"exercise_id": PUSHUPS, "reps": 5, "duration_seconds": 40},  # минутки
                {"exercise_id": SQUATS, "max_effort": True},  # до отказа
            ]
        }
    ]

    assert _create(client, admin, scheme).status_code == 200


# --- Правила проверки -----------------------------------------------------------------


@pytest.mark.parametrize(
    "scheme, message",
    [
        ([{"items": []}], "хотя бы одно упражнение"),
        (
            [{"items": [{"exercise_id": PULLUPS, "reps": 5, "max_effort": True}]}],
            "одновременно",
        ),
        (
            [{"rounds": None, "items": [{"exercise_id": PULLUPS, "reps": 5}]}],
            "лимит времени",
        ),
        ([{"rounds": 0, "items": [{"exercise_id": PULLUPS, "reps": 5}]}], "от 1 до"),
        (
            [{"items": [{"exercise_id": PULLUPS, "reps": 0}]}],
            "повторений — от 1",
        ),
        (
            [{"items": [{"exercise_id": PULLUPS, "duration_seconds": 0}]}],
            "время вне допустимых",
        ),
        (
            [{"items": [{"exercise_id": PULLUPS, "max_effort": True, "reps_step": -1}]}],
            "только при заданном числе повторений",
        ),
        (
            [
                {
                    "rounds": 15,
                    "items": [{"exercise_id": PULLUPS, "reps": 10, "reps_step": -1}],
                }
            ],
            "опускаются ниже 1",
        ),
    ],
)
def test_invalid_scheme_is_rejected_with_clear_message(client, admin, scheme, message):
    response = _create(client, admin, scheme)

    assert response.status_code == 422
    assert message in response.json()["detail"]
    assert client.get("/complexes/scheme-complex").status_code == 404


def test_progression_with_limit_is_accepted_where_without_it_is_not(client, admin):
    """Те же 15 кругов с границей «не ниже 5» — допустимы."""
    scheme = [
        {
            "rounds": 15,
            "items": [
                {"exercise_id": PULLUPS, "reps": 10, "reps_step": -1, "reps_limit": 5}
            ],
        }
    ]

    assert _create(client, admin, scheme).status_code == 200


def test_unknown_exercise_in_scheme_is_rejected(client, admin):
    response = _create(
        client, admin, [{"items": [{"exercise_id": "no-such-exercise", "reps": 5}]}]
    )

    assert response.status_code == 422
    assert "no-such-exercise" in response.json()["detail"]


def test_too_many_blocks_are_rejected(client, admin):
    scheme = [{"items": [{"exercise_id": PULLUPS, "reps": 5}]} for _ in range(21)]

    assert _create(client, admin, scheme).status_code == 422


# --- Изменение ------------------------------------------------------------------------


def test_updating_scheme_updates_derived_fields(client, admin):
    _create(client, admin, [{"items": [{"exercise_id": PULLUPS, "reps": 5}]}])

    response = client.put(
        "/complexes/scheme-complex",
        json={
            "scheme": [
                {
                    "rounds": 2,
                    "items": [
                        {"exercise_id": PUSHUPS, "reps": 10},
                        {"exercise_id": PUSHUPS, "reps": 8},
                    ],
                }
            ],
            "scheme_note": "Новая заметка",
        },
        headers=admin,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["exercise_ids"] == [PUSHUPS]
    assert body["scheme_note"] == "Новая заметка"
    name = _name(client, PUSHUPS)
    assert body["exercise"] == f"1. {name}  •  2. {name}"


def test_update_without_scheme_keeps_it(client, admin):
    _create(client, admin, [{"items": [_max_for_a_minute(PULLUPS)]}])

    response = client.put(
        "/complexes/scheme-complex", json={"name": "Новое имя"}, headers=admin
    )

    assert response.json()["scheme"][0]["items"][0]["exercise_id"] == PULLUPS


def test_invalid_scheme_in_update_changes_nothing(client, admin):
    _create(client, admin, [{"items": [_max_for_a_minute(PULLUPS)]}])

    response = client.put(
        "/complexes/scheme-complex",
        json={"scheme": [{"items": []}]},
        headers=admin,
    )

    assert response.status_code == 422
    stored = client.get("/complexes/scheme-complex").json()
    assert stored["scheme"][0]["items"][0]["exercise_id"] == PULLUPS


def test_exercise_list_cannot_be_changed_separately_from_scheme(client, admin):
    _create(client, admin, [{"items": [_max_for_a_minute(PULLUPS)]}])

    response = client.put(
        "/complexes/scheme-complex",
        json={"exercise_ids": [PUSHUPS]},
        headers=admin,
    )

    assert response.status_code == 422
    assert "схеме" in response.json()["detail"]


def test_interval_type_is_available(client, admin):
    response = _create(client, admin, [{"items": [_max_for_a_minute(PULLUPS)]}])

    assert response.json()["types"] == ["interval"]


# --- Связь с базой упражнений ---------------------------------------------------------


def test_exercise_used_in_scheme_cannot_be_deleted(client, admin):
    _create(
        client,
        admin,
        [{"items": [_max_for_a_minute(SQUATS), _max_for_a_minute(SQUATS)]}],
        name="Мои приседания",
    )

    response = client.delete(f"/exercises/{SQUATS}", headers=admin)

    assert response.status_code == 409
    # Упражнение стоит в схеме дважды, а в сообщении комплекс — один раз.
    assert response.json()["detail"].count("Мои приседания") == 1


def test_seed_complex_has_structured_scheme(client):
    seed = client.get("/complexes/hannibal-scheme-steel").json()
    block = seed["scheme"][0]

    assert block["rounds"] == 11 and block["rounds_kind"] == "rounds"
    assert [item["exercise_id"] for item in block["items"]] == [
        "pullups-wide", "pushups", "pullups-reverse", "dips",
    ]
    assert [item["reps"] for item in block["items"]] == [10, 30, 10, 20]
    assert all(item["reps_step"] == -1 for item in block["items"])
    assert [item["reps_limit"] for item in block["items"]] == [5, None, 5, None]


def test_guest_can_read_scheme(client, admin):
    _create(client, admin, [{"items": [_max_for_a_minute(PULLUPS)]}])

    response = client.get("/complexes/scheme-complex")  # без токена

    assert response.status_code == 200
    assert response.json()["scheme"][0]["items"][0]["max_effort"] is True
