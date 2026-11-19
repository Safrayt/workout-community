"""
Схема комплекса в новом формате (Complex.auto_scheme).

Это та же структура, что у автоматических схем программ: с ней комплекс
можно проходить с помощником и таймерами. Здесь — серверная часть:
сохранение, проверка заполненности и производные поля комплекса
(список упражнений, текст «Упражнение(я)»). Старая схема (scheme) при
этом заменяется.
"""

import pytest
from sqlmodel import select

from app.models import User
from conftest import auth_headers, register_user

PULLUPS = "pullups-wide"
PUSHUPS = "pushups"


@pytest.fixture(name="admin")
def admin_fixture(client, session):
    user = register_user(client, nickname="admin")
    row = session.exec(select(User).where(User.nickname == "admin")).first()
    row.is_admin = True
    session.add(row)
    session.commit()
    return auth_headers(user["token"])


def _item(exercise_id=None, text=None, kind="reps", value=10, **extra):
    item = {"target": {"kind": kind, "value": value}, **extra}

    if exercise_id is not None:
        item["exercise_id"] = exercise_id

    if text is not None:
        item["text"] = text

    return item


def _auto_scheme(items, **block):
    return {
        "name": "Схема",
        "mode": "auto",
        "blocks": [
            {"rounds": 3, "rest_between_rounds": 60, "items": items, **block}
        ],
    }


def _payload(auto_scheme, **overrides):
    return {
        "id": "auto-complex",
        "name": "Комплекс с помощником",
        "types": ["circuit"],
        "result_metrics": ["time", "reps"],
        "auto_scheme": auto_scheme,
        **overrides,
    }


def _create(client, admin, auto_scheme, **overrides):
    return client.post(
        "/complexes/", json=_payload(auto_scheme, **overrides), headers=admin
    )


def _name(client, exercise_id):
    return client.get(f"/exercises/{exercise_id}").json()["name"]


def test_complex_with_auto_scheme_is_saved_with_derived_fields(client, admin):
    response = _create(
        client,
        admin,
        _auto_scheme(
            [
                _item(PULLUPS, value=10),
                _item(PUSHUPS, value=20),
                _item(PULLUPS, kind="max", value=8),
            ]
        ),
    )

    assert response.status_code == 200, response.text
    body = response.json()

    assert body["auto_scheme"]["mode"] == "auto"
    assert body["scheme"] == []
    # Разные упражнения — по порядку первого появления, без повторов.
    assert body["exercise_ids"] == [PULLUPS, PUSHUPS]

    pullups, pushups = _name(client, PULLUPS), _name(client, PUSHUPS)
    assert body["exercise"] == f"1. {pullups}  •  2. {pushups}  •  3. {pullups}"
    assert body["movements"] == ["pull", "push"]


def test_custom_text_exercise_is_part_of_the_exercise_text(client, admin):
    response = _create(
        client,
        admin,
        _auto_scheme([_item(PULLUPS), _item(text="Берпи", value=15)]),
    )

    assert response.status_code == 200, response.text
    body = response.json()

    assert body["exercise_ids"] == [PULLUPS]
    assert body["exercise"].endswith("2. Берпи")


def test_auto_scheme_survives_a_reload(client, admin):
    # EMOM без примерного числа повторений не готов к прохождению.
    incomplete = _create(
        client, admin, _auto_scheme([_item(PULLUPS, kind="emom", value=40)])
    )
    assert incomplete.status_code == 422
    assert client.get("/complexes/auto-complex").status_code == 404

    response = _create(
        client,
        admin,
        _auto_scheme(
            [
                {
                    "exercise_id": PULLUPS,
                    "target": {"kind": "emom", "value": 40, "reps": 10},
                }
            ]
        ),
    )
    assert response.status_code == 200, response.text

    loaded = client.get("/complexes/auto-complex").json()

    assert loaded["auto_scheme"]["blocks"][0]["items"][0]["target"] == {
        "kind": "emom",
        "value": 40,
        "with_reps": True,
        "reps": 10,
    }


def test_incomplete_auto_scheme_is_rejected_with_a_clear_message(client, admin):
    response = _create(
        client,
        admin,
        _auto_scheme([{"exercise_id": PULLUPS}]),
    )

    assert response.status_code == 422
    assert "у каждого упражнения нужно указать" in response.json()["detail"]


def test_free_scheme_cannot_be_used_as_complex_scheme(client, admin):
    scheme = _auto_scheme([_item(PULLUPS)])
    scheme["mode"] = "free"

    response = _create(client, admin, scheme)

    assert response.status_code == 422
    assert "автоматической" in response.json()["detail"]


def test_unknown_exercise_in_auto_scheme_is_rejected(client, admin):
    response = _create(client, admin, _auto_scheme([_item("no-such-exercise")]))

    assert response.status_code == 422
    assert "no-such-exercise" in response.json()["detail"]


def test_both_scheme_formats_at_once_are_rejected(client, admin):
    response = _create(
        client,
        admin,
        _auto_scheme([_item(PULLUPS)]),
        scheme=[{"items": [{"exercise_id": PUSHUPS, "reps": 5}]}],
    )

    assert response.status_code == 422


def test_auto_scheme_replaces_the_old_scheme_on_update(client, admin):
    created = client.post(
        "/complexes/",
        json={
            "id": "auto-complex",
            "name": "Старый комплекс",
            "types": ["sets"],
            "result_metrics": ["reps"],
            "scheme": [{"rounds": 2, "items": [{"exercise_id": PUSHUPS, "reps": 5}]}],
        },
        headers=admin,
    )
    assert created.status_code == 200, created.text
    assert created.json()["exercise_ids"] == [PUSHUPS]

    response = client.put(
        "/complexes/auto-complex",
        json={"auto_scheme": _auto_scheme([_item(PULLUPS)])},
        headers=admin,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["scheme"] == []
    assert body["exercise_ids"] == [PULLUPS]
    assert body["auto_scheme"]["blocks"][0]["items"][0]["exercise_id"] == PULLUPS


def test_auto_scheme_cannot_be_removed(client, admin):
    _create(client, admin, _auto_scheme([_item(PULLUPS)]))

    response = client.put(
        "/complexes/auto-complex", json={"auto_scheme": None}, headers=admin
    )

    assert response.status_code == 422


def test_exercise_list_cannot_be_changed_separately_from_auto_scheme(client, admin):
    _create(client, admin, _auto_scheme([_item(PULLUPS)]))

    response = client.put(
        "/complexes/auto-complex", json={"exercise_ids": [PUSHUPS]}, headers=admin
    )

    assert response.status_code == 422


def test_update_without_auto_scheme_keeps_it(client, admin):
    _create(client, admin, _auto_scheme([_item(PULLUPS)]))

    response = client.put(
        "/complexes/auto-complex", json={"name": "Другое имя"}, headers=admin
    )

    assert response.status_code == 200, response.text
    assert response.json()["auto_scheme"]["blocks"][0]["items"][0]["exercise_id"] == PULLUPS


def test_exercise_used_in_auto_scheme_cannot_be_deleted(client, admin):
    _create(client, admin, _auto_scheme([_item(PULLUPS)]))

    response = client.delete(f"/exercises/{PULLUPS}", headers=admin)

    assert response.status_code == 409, response.text
