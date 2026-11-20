"""
Пометка выполнения комплекса, внесённого из помощника
(ComplexCompletionBase.via_assistant): ставится при создании, по
умолчанию (ручной ввод) выключена, а прошлые выполнения записи
дневника при добавлении нового не меняются.
"""

from datetime import date

from sqlmodel import select

from app.models import User
from conftest import auth_headers, register_user

COMPLEX_ID = "hannibal-scheme-steel"
TODAY = date.today().isoformat()


def _setup(client, session):
    user = register_user(client, nickname="athlete")
    db_user = session.exec(select(User).where(User.nickname == "athlete")).first()

    from app.models_diary import WorkoutEntry

    entry = WorkoutEntry(
        date=date.today(), title="Тренировка", user_id=db_user.id
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    return auth_headers(user["token"]), entry.id


def _create(client, headers, entry_id, **fields):
    return client.post(
        f"/complexes/{COMPLEX_ID}/completions",
        json={
            "complex_id": COMPLEX_ID,
            "completed_date": TODAY,
            "diary_entry_id": entry_id,
            **fields,
        },
        headers=headers,
    )


def test_completion_is_manual_by_default(client, session):
    headers, entry_id = _setup(client, session)

    response = _create(client, headers, entry_id, result_time_seconds=1500)

    assert response.status_code == 200, response.text
    assert response.json()["via_assistant"] is False


def test_completion_from_assistant_is_marked(client, session):
    headers, entry_id = _setup(client, session)

    response = _create(
        client,
        headers,
        entry_id,
        result_time_seconds=1500,
        result_reps=240,
        via_assistant=True,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["via_assistant"] is True
    assert body["result_reps"] == 240


def test_new_completion_keeps_previous_ones_of_the_same_entry(client, session):
    headers, entry_id = _setup(client, session)

    first = _create(client, headers, entry_id, result_reps=100).json()
    second = _create(
        client, headers, entry_id, result_reps=120, via_assistant=True
    ).json()

    history = client.get(
        f"/complexes/{COMPLEX_ID}/completions", headers=headers
    ).json()

    assert {item["id"] for item in history} == {first["id"], second["id"]}
    kept = next(item for item in history if item["id"] == first["id"])
    assert kept["result_reps"] == 100
    assert kept["via_assistant"] is False
    assert all(item["diary_entry_id"] == entry_id for item in history)


def test_marking_cannot_be_changed_by_update(client, session):
    headers, entry_id = _setup(client, session)

    created = _create(client, headers, entry_id, result_reps=100).json()

    response = client.put(
        f"/complexes/completions/{created['id']}",
        json={"result_reps": 110, "via_assistant": True},
        headers=headers,
    )

    assert response.status_code == 200, response.text
    assert response.json()["via_assistant"] is False


def test_my_completions_lists_only_own_results_of_all_complexes(client, session):
    mine_headers, mine_entry = _setup(client, session)

    other = register_user(client, nickname="other")
    other_user = session.exec(select(User).where(User.nickname == "other")).first()

    from app.models_diary import WorkoutEntry

    other_entry = WorkoutEntry(
        date=date.today(), title="Чужая", user_id=other_user.id
    )
    session.add(other_entry)
    session.commit()
    session.refresh(other_entry)

    first = _create(client, mine_headers, mine_entry, result_reps=100).json()
    _create(
        client,
        auth_headers(other["token"]),
        other_entry.id,
        result_reps=999,
    )

    response = client.get("/complexes/completions/mine", headers=mine_headers)

    assert response.status_code == 200, response.text
    assert [item["id"] for item in response.json()] == [first["id"]]


def test_my_completions_requires_login(client):
    assert client.get("/complexes/completions/mine").status_code == 401
