"""
Выполненные упражнения записи дневника: список упражнений с результатом
каждого подхода (например, 5, 4, 2). Название упражнения из базы
подставляет сервер, упражнения без подходов не сохраняются, а при
редактировании список либо не меняется (не передан), либо заменяется
целиком (в том числе пустым).
"""

from datetime import date

from sqlmodel import select

from app.models_exercise import ExerciseDB
from conftest import auth_headers, register_user


def _exercise(session) -> ExerciseDB:
    return session.exec(select(ExerciseDB)).first()


def _payload(**fields) -> dict:
    return {
        "date": date.today().isoformat(),
        "title": "Тренировка",
        "description": "",
        "tags": [],
        **fields,
    }


def _create(client, token, **fields):
    return client.post(
        "/diary/entries", json=_payload(**fields), headers=auth_headers(token)
    )


def _update(client, token, entry_id, **fields):
    return client.put(
        f"/diary/entries/{entry_id}", json=fields, headers=auth_headers(token)
    )


def test_entry_without_exercises_has_empty_list(client):
    user = register_user(client, nickname="ex_none")

    response = _create(client, user["token"])

    assert response.status_code == 200, response.text
    assert response.json()["exercises"] == []


def test_exercises_are_saved_with_sets_in_order(client, session):
    user = register_user(client, nickname="ex_save")
    exercise = _exercise(session)

    response = _create(
        client,
        user["token"],
        exercises=[
            {"exercise_id": exercise.id, "name": "подделка", "sets": [5, 4, 2]},
            {"name": "Своё упражнение", "unit": "seconds", "sets": [30]},
        ],
    )

    assert response.status_code == 200, response.text
    saved = response.json()["exercises"]

    assert saved == [
        {
            "exercise_id": exercise.id,
            # Название из базы, а не присланное клиентом.
            "name": exercise.name,
            "unit": "reps",
            "sets": [5, 4, 2],
            "weight_kg": None,
        },
        {
            "exercise_id": None,
            "name": "Своё упражнение",
            "unit": "seconds",
            "sets": [30],
            "weight_kg": None,
        },
    ]

    fetched = client.get(
        f"/diary/entries/{response.json()['id']}",
        headers=auth_headers(user["token"]),
    )
    assert fetched.json()["exercises"] == saved


def test_exercises_without_sets_are_not_saved(client, session):
    user = register_user(client, nickname="ex_empty_sets")
    exercise = _exercise(session)

    response = _create(
        client,
        user["token"],
        exercises=[{"exercise_id": exercise.id, "sets": []}],
    )

    assert response.status_code == 200, response.text
    assert response.json()["exercises"] == []


def test_unknown_exercise_is_rejected(client):
    user = register_user(client, nickname="ex_unknown")

    response = _create(
        client,
        user["token"],
        exercises=[{"exercise_id": "no-such-exercise", "sets": [5]}],
    )

    assert response.status_code == 400


def test_custom_exercise_needs_a_name(client):
    user = register_user(client, nickname="ex_noname")

    response = _create(client, user["token"], exercises=[{"sets": [5]}])

    assert response.status_code == 400


def test_invalid_set_values_are_rejected(client):
    user = register_user(client, nickname="ex_invalid")

    for sets in ([0], [-1], [10000], [1] * 101):
        response = _create(
            client,
            user["token"],
            exercises=[{"name": "Отжимания", "sets": sets}],
        )

        assert response.status_code == 422, sets


def test_too_many_exercises_are_rejected(client):
    user = register_user(client, nickname="ex_many")

    response = _create(
        client,
        user["token"],
        exercises=[{"name": f"Упражнение {n}", "sets": [5]} for n in range(31)],
    )

    assert response.status_code == 422


def test_update_keeps_replaces_and_clears_exercises(client):
    user = register_user(client, nickname="ex_update")
    token = user["token"]
    entry = _create(
        client, token, exercises=[{"name": "Отжимания", "sets": [10, 8]}]
    ).json()

    # Не передали — не трогаем.
    kept = _update(client, token, entry["id"], title="Новое название")
    assert kept.json()["exercises"] == entry["exercises"]

    # Передали список — заменяем целиком.
    replaced = _update(
        client,
        token,
        entry["id"],
        exercises=[{"name": "Подтягивания", "sets": [5, 4, 2]}],
    )
    assert [e["name"] for e in replaced.json()["exercises"]] == ["Подтягивания"]
    assert replaced.json()["exercises"][0]["sets"] == [5, 4, 2]

    # Пустой список — убираем.
    cleared = _update(client, token, entry["id"], exercises=[])
    assert cleared.json()["exercises"] == []


def test_exercises_belong_to_the_entry_owner(client):
    owner = register_user(client, nickname="ex_owner")
    other = register_user(client, nickname="ex_other")
    entry = _create(client, owner["token"]).json()

    response = _update(
        client,
        other["token"],
        entry["id"],
        exercises=[{"name": "Отжимания", "sets": [10]}],
    )

    assert response.status_code in (403, 404)


def test_weight_is_saved_with_sign(client):
    user = register_user(client, nickname="ex_weight")

    response = _create(
        client,
        user["token"],
        exercises=[
            {"name": "Подтягивания", "sets": [5], "weight_kg": 10},
            {"name": "Подтягивания", "sets": [8], "weight_kg": -20.5},
            {"name": "Отжимания", "sets": [20], "weight_kg": 0},
            {"name": "Приседания", "sets": [15]},
        ],
    )

    assert response.status_code == 200, response.text
    weights = [e["weight_kg"] for e in response.json()["exercises"]]

    # Плюс — утяжелитель, минус — помощь; 0 и «нет» — без веса.
    assert weights == [10, -20.5, None, None]


def test_weight_out_of_range_is_rejected(client):
    user = register_user(client, nickname="ex_weight_bad")

    for weight in (501, -501):
        response = _create(
            client,
            user["token"],
            exercises=[{"name": "Подтягивания", "sets": [5], "weight_kg": weight}],
        )

        assert response.status_code == 422, weight
