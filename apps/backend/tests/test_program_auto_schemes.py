"""
Автоматические схемы программ: режим схемы, цели упражнений (повторения
или секунды), сеты, круги и отдых в секундах. Черновик можно сохранять
неполным, а публиковать версию с автоматической схемой — только когда
в ней заполнено всё нужное для прохождения с таймерами. Свободные схемы
в данных выглядят как раньше.
"""

import pytest

from tests.conftest import auth_headers, register_user

PULLUPS = "pullups-wide"  # есть в стартовых данных
DIPS = "dips"


def _item(exercise_id=PULLUPS, target=None, **fields):
    item = {"exercise_id": exercise_id, **fields}

    if target is not None:
        item["target"] = target

    return item


def _structure(blocks, mode=None):
    scheme = {"name": "Понедельник", "blocks": blocks}

    if mode is not None:
        scheme["mode"] = mode

    return {"sections": [{"name": None, "schemes": [scheme]}]}


def _complete_block(**fields):
    block = {
        "title": "Комплекс 1",
        "items": [
            _item(PULLUPS, {"kind": "reps", "value": 8}),
            _item(DIPS, {"kind": "seconds", "value": 60}),
        ],
        "rounds": 3,
        "rest_between_rounds": 120,
        "rest_between_sets": 180,
    }
    block.update(fields)

    return block


def _create_program(client, token):
    response = client.post(
        "/programs/",
        json={"title": "Рутинка", "description": "Базовая программа"},
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


def _draft_scheme(client, token, program_id):
    draft = client.get(
        f"/programs/{program_id}/draft", headers=auth_headers(token)
    ).json()

    return draft["structure"]["sections"][0]["schemes"][0]


def _publish(client, token, program_id):
    return client.post(
        f"/programs/{program_id}/publish",
        json={},
        headers=auth_headers(token),
    )


@pytest.fixture(name="author")
def author_fixture(client):
    return register_user(client, "auto_scheme_author")


def test_free_scheme_is_stored_without_automatic_fields(client, author):
    program = _create_program(client, author["token"])
    structure = _structure(
        [{"title": "Блок 1", "items": [_item(load="20 повторений")]}]
    )

    response = _save_draft(client, author["token"], program["id"], structure)

    assert response.status_code == 200, response.text

    scheme = _draft_scheme(client, author["token"], program["id"])
    assert "mode" not in scheme

    block = scheme["blocks"][0]
    assert "rounds" not in block
    assert "order" not in block
    assert "emom_together" not in block
    assert "rest_between_rounds" not in block
    assert block["items"][0] == {
        "exercise_id": PULLUPS,
        "text": None,
        "load": "20 повторений",
    }


def test_automatic_scheme_keeps_all_its_fields(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        order="interleaved",
        rest_within_set=15,
        rest_after_block=240,
    )
    block["items"][1]["group_with_previous"] = True

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 200, response.text

    scheme = _draft_scheme(client, author["token"], program["id"])
    saved = scheme["blocks"][0]

    assert scheme["mode"] == "auto"
    assert saved["rounds"] == 3
    assert saved["order"] == "interleaved"
    assert saved["rest_within_set"] == 15
    assert saved["rest_between_rounds"] == 120
    assert saved["rest_between_sets"] == 180
    assert saved["rest_after_block"] == 240
    assert saved["items"][0]["target"] == {"kind": "reps", "value": 8}
    assert saved["items"][1]["target"] == {"kind": "seconds", "value": 60}
    assert saved["items"][1]["group_with_previous"] is True
    assert "group_with_previous" not in saved["items"][0]


def test_max_target_is_saved_with_approximate_reps(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            _item(PULLUPS, {"kind": "max", "value": 12}),
            _item(DIPS, {"kind": "seconds", "value": 60}),
        ]
    )

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 200, response.text

    scheme = _draft_scheme(client, author["token"], program["id"])

    assert scheme["blocks"][0]["items"][0]["target"] == {
        "kind": "max",
        "value": 12,
    }


@pytest.mark.parametrize(
    "bad_fields",
    [
        {"rounds": 0},
        {"rounds": 51},
        {"rest_between_rounds": -1},
        {"rest_between_sets": 3601},
        {"order": "diagonal"},
    ],
)
def test_out_of_range_block_values_are_rejected(client, author, bad_fields):
    program = _create_program(client, author["token"])

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([_complete_block(**bad_fields)], mode="auto"),
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "bad_target",
    [
        {"kind": "reps", "value": 0},
        {"kind": "reps", "value": 1000},
        {"kind": "max", "value": 0},
        {"kind": "max", "value": 1000},
        {"kind": "amrap", "value": 3601},
        {"kind": "amrap", "value": 0},
        {"kind": "emom", "value": 3601},
        {"kind": "emom", "value": 0},
        {"kind": "seconds", "value": 3601},
        {"kind": "minutes", "value": 5},
    ],
)
def test_out_of_range_targets_are_rejected(client, author, bad_target):
    program = _create_program(client, author["token"])
    block = _complete_block(items=[_item(PULLUPS, bad_target)])

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 422


def test_incomplete_automatic_draft_can_be_saved(client, author):
    program = _create_program(client, author["token"])
    block = {"title": "Комплекс 1", "items": [_item(PULLUPS)]}

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 200, response.text


def test_incomplete_automatic_scheme_cannot_be_published(client, author):
    program = _create_program(client, author["token"])
    block = {"title": "Комплекс 1", "items": [_item(PULLUPS)]}

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    response = _publish(client, author["token"], program["id"])

    assert response.status_code == 422
    assert "Автоматические схемы заполнены не полностью" in response.json()["detail"]
    assert "Понедельник" in response.json()["detail"]


@pytest.mark.parametrize(
    "block",
    [
        # нет числа кругов
        _complete_block(rounds=None),
        # несколько кругов, но нет отдыха между ними
        _complete_block(rest_between_rounds=None),
        # два сета, но нет отдыха между сетами
        _complete_block(rest_between_sets=None),
        # у упражнения нет цели
        _complete_block(items=[_item(PULLUPS), _item(DIPS)]),
        # комплекс без упражнений
        _complete_block(items=[]),
    ],
)
def test_each_missing_piece_blocks_publishing(client, author, block):
    program = _create_program(client, author["token"])
    block = {key: value for key, value in block.items() if value is not None}

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    response = _publish(client, author["token"], program["id"])

    assert response.status_code == 422, response.text


def test_complete_automatic_scheme_can_be_published(client, author):
    program = _create_program(client, author["token"])

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([_complete_block()], mode="auto"),
    )

    response = _publish(client, author["token"], program["id"])

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "published"


def test_rests_that_do_not_apply_are_not_required(client, author):
    # Один сет и один круг: отдыха между кругами и сетами не нужно.
    program = _create_program(client, author["token"])
    block = {
        "title": "Комплекс 1",
        "items": [_item(PULLUPS, {"kind": "reps", "value": 10})],
        "rounds": 1,
    }

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    response = _publish(client, author["token"], program["id"])

    assert response.status_code == 200, response.text


def test_each_set_can_have_its_own_number_of_rounds(client, author):
    # Сет 1 — 2 подхода, сет 2 — 4 подхода; числа лежат у первых
    # упражнений сетов, а у комплекса числа подходов может не быть.
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            _item(PULLUPS, {"kind": "reps", "value": 8}, rounds=2),
            _item(DIPS, {"kind": "reps", "value": 10}, rounds=4),
        ],
    )
    del block["rounds"]

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 200, response.text

    saved = _draft_scheme(client, author["token"], program["id"])["blocks"][0]
    assert [item["rounds"] for item in saved["items"]] == [2, 4]
    assert "rounds" not in saved

    assert _publish(client, author["token"], program["id"]).status_code == 200


def test_set_without_own_rounds_uses_the_block_rounds(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            _item(PULLUPS, {"kind": "reps", "value": 8}),
            _item(DIPS, {"kind": "reps", "value": 10}, rounds=4),
        ],
    )

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert _publish(client, author["token"], program["id"]).status_code == 200


def test_set_rounds_are_required_when_block_has_none(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            _item(PULLUPS, {"kind": "reps", "value": 8}, rounds=2),
            _item(DIPS, {"kind": "reps", "value": 10}),
        ],
    )
    del block["rounds"]

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    response = _publish(client, author["token"], program["id"])

    assert response.status_code == 422
    assert "число подходов или кругов" in response.json()["detail"]


def test_interleaved_order_uses_block_rounds_not_set_rounds(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        order="interleaved",
        items=[
            _item(PULLUPS, {"kind": "reps", "value": 8}, rounds=2),
            _item(DIPS, {"kind": "reps", "value": 10}, rounds=4),
        ],
    )
    del block["rounds"]

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    response = _publish(client, author["token"], program["id"])

    assert response.status_code == 422


def test_rest_between_rounds_is_not_required_when_every_set_has_one_round(
    client, author
):
    program = _create_program(client, author["token"])
    block = {
        "title": "Комплекс 1",
        "items": [
            _item(PULLUPS, {"kind": "reps", "value": 8}, rounds=1),
            _item(DIPS, {"kind": "reps", "value": 10}, rounds=1),
        ],
        "rounds": 1,
        "rest_between_sets": 60,
    }

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert _publish(client, author["token"], program["id"]).status_code == 200


def test_out_of_range_item_rounds_are_rejected(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[_item(PULLUPS, {"kind": "reps", "value": 8}, rounds=0)],
    )

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 422


def test_timed_exercise_can_also_count_reps(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            _item(
                PULLUPS,
                {"kind": "seconds", "value": 30, "with_reps": True, "reps": 12},
            ),
            _item(DIPS, {"kind": "seconds", "value": 60}),
        ],
    )

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 200, response.text

    items = _draft_scheme(client, author["token"], program["id"])["blocks"][0][
        "items"
    ]
    assert items[0]["target"] == {
        "kind": "seconds",
        "value": 30,
        "with_reps": True,
        "reps": 12,
    }
    # Без подсчёта повторений данные такие же, как раньше.
    assert items[1]["target"] == {"kind": "seconds", "value": 60}

    assert _publish(client, author["token"], program["id"]).status_code == 200


def test_amrap_always_counts_reps_and_is_saved_with_timer_seconds(
    client, author
):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            # with_reps не передан — у AMRAP повторения считаются всегда.
            _item(PULLUPS, {"kind": "amrap", "value": 180, "reps": 15}),
            _item(DIPS, {"kind": "seconds", "value": 60}),
        ],
    )

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 200, response.text

    items = _draft_scheme(client, author["token"], program["id"])["blocks"][0][
        "items"
    ]
    assert items[0]["target"] == {
        "kind": "amrap",
        "value": 180,
        "with_reps": True,
        "reps": 15,
    }

    assert _publish(client, author["token"], program["id"]).status_code == 200


def test_emom_always_counts_reps_and_is_saved_with_interval_seconds(
    client, author
):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            _item(PULLUPS, {"kind": "emom", "value": 40, "reps": 10}),
            _item(DIPS, {"kind": "seconds", "value": 60}),
        ],
        rounds=5,
        rest_between_rounds=0,
    )

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 200, response.text

    items = _draft_scheme(client, author["token"], program["id"])["blocks"][0][
        "items"
    ]
    assert items[0]["target"] == {
        "kind": "emom",
        "value": 40,
        "with_reps": True,
        "reps": 10,
    }

    assert _publish(client, author["token"], program["id"]).status_code == 200


def test_emom_together_flag_is_saved_only_when_enabled(client, author):
    program = _create_program(client, author["token"])
    emom_items = [
        _item(PULLUPS, {"kind": "emom", "value": 60, "reps": 10}),
        {
            **_item(DIPS, {"kind": "emom", "value": 60, "reps": 15}),
            "group_with_previous": True,
        },
    ]

    enabled = _complete_block(
        items=emom_items,
        rounds=5,
        rest_between_rounds=0,
        emom_together=True,
    )
    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([enabled], mode="auto"),
    )

    assert response.status_code == 200, response.text
    saved = _draft_scheme(client, author["token"], program["id"])["blocks"][0]
    assert saved["emom_together"] is True

    disabled = _complete_block(
        items=emom_items,
        rounds=5,
        rest_between_rounds=0,
        emom_together=False,
    )
    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([disabled], mode="auto"),
    )
    saved = _draft_scheme(client, author["token"], program["id"])["blocks"][0]
    assert "emom_together" not in saved


def test_emom_without_approximate_reps_cannot_be_published(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            _item(PULLUPS, {"kind": "emom", "value": 40}),
            _item(DIPS, {"kind": "seconds", "value": 60}),
        ],
    )

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    response = _publish(client, author["token"], program["id"])

    assert response.status_code == 422
    assert "подсчётом повторений" in response.json()["detail"]


def test_amrap_without_approximate_reps_cannot_be_published(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            _item(PULLUPS, {"kind": "amrap", "value": 180}),
            _item(DIPS, {"kind": "seconds", "value": 60}),
        ],
    )

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    response = _publish(client, author["token"], program["id"])

    assert response.status_code == 422
    assert "подсчётом повторений" in response.json()["detail"]


def test_reps_for_timed_exercise_are_required_when_counted(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            _item(
                PULLUPS,
                {"kind": "seconds", "value": 30, "with_reps": True},
            ),
            _item(DIPS, {"kind": "seconds", "value": 60}),
        ],
    )

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    response = _publish(client, author["token"], program["id"])

    assert response.status_code == 422
    assert "подсчётом повторений" in response.json()["detail"]


def test_counting_reps_is_dropped_for_exercises_on_reps(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            _item(
                PULLUPS,
                {"kind": "reps", "value": 8, "with_reps": True, "reps": 5},
            ),
            _item(DIPS, {"kind": "seconds", "value": 60, "reps": 5}),
        ],
    )

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    items = _draft_scheme(client, author["token"], program["id"])["blocks"][0][
        "items"
    ]

    assert items[0]["target"] == {"kind": "reps", "value": 8}
    assert items[1]["target"] == {"kind": "seconds", "value": 60}


def test_out_of_range_target_reps_are_rejected(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block(
        items=[
            _item(
                PULLUPS,
                {"kind": "seconds", "value": 30, "with_reps": True, "reps": 0},
            ),
        ],
    )

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 422


def test_incomplete_free_scheme_is_published_as_before(client, author):
    program = _create_program(client, author["token"])
    block = {"title": "Блок 1", "items": [_item(PULLUPS)]}

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block]),
    )

    response = _publish(client, author["token"], program["id"])

    assert response.status_code == 200, response.text


def test_item_weight_is_saved_with_sign(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block()
    block["items"][0]["weight_kg"] = 10
    block["items"][1]["weight_kg"] = -20.5

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 200, response.text

    saved = _draft_scheme(client, author["token"], program["id"])["blocks"][0]
    # Плюс — утяжелитель, минус — помощь (резинка, гравитрон).
    assert saved["items"][0]["weight_kg"] == 10
    assert saved["items"][1]["weight_kg"] == -20.5


def test_item_without_weight_has_no_weight_field(client, author):
    program = _create_program(client, author["token"])
    block = _complete_block()
    block["items"][0]["weight_kg"] = 0

    _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    saved = _draft_scheme(client, author["token"], program["id"])["blocks"][0]
    assert "weight_kg" not in saved["items"][0]
    assert "weight_kg" not in saved["items"][1]


@pytest.mark.parametrize("weight", [501, -501])
def test_item_weight_out_of_range_is_rejected(client, author, weight):
    program = _create_program(client, author["token"])
    block = _complete_block()
    block["items"][0]["weight_kg"] = weight

    response = _save_draft(
        client,
        author["token"],
        program["id"],
        _structure([block], mode="auto"),
    )

    assert response.status_code == 422
