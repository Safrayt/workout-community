"""
Карта мышц на странице профиля: /diary/muscle-load. Мышцы считаются по
записям дневника за период — упражнения из базы в выбранной схеме программы
и в выполненных комплексах, привязанных к записи.
"""

from datetime import date, timedelta

from sqlmodel import select

from app.models import User
from app.models_diary import WorkoutEntry
from tests.conftest import auth_headers, register_user
from tests.test_programs import _create_program

PULLUPS = "pullups-wide"  # есть в стартовых данных
DIPS = "dips"
COMPLEX_ID = "hannibal-scheme-steel"

TODAY = date.today()

STRUCTURE = {
    "sections": [
        {
            "id": "sec-a",
            "name": "Неделя 1",
            "schemes": [
                {
                    "id": "sch-a1",
                    "name": "Тренировка A",
                    "blocks": [
                        {
                            "title": "Блок 1",
                            "scheme": "5x10",
                            "items": [{"exercise_id": PULLUPS}],
                        }
                    ],
                },
                {
                    "id": "sch-a2",
                    "name": "Тренировка B",
                    "blocks": [
                        {
                            "title": "Блок 1",
                            "scheme": "5x10",
                            "items": [{"exercise_id": DIPS}, {"text": "Берпи"}],
                        }
                    ],
                },
            ],
        }
    ]
}


def _muscles(client, exercise_ids):
    """Целевые и вспомогательные мышцы упражнений, как их отдаёт база."""
    target, auxiliary = set(), set()

    for exercise_id in exercise_ids:
        data = client.get(f"/exercises/{exercise_id}").json()
        target.update(data["target_muscles"])
        auxiliary.update(data["auxiliary_muscles"])

    return sorted(target), sorted(auxiliary - target)


def _user_id(session, nickname):
    return session.exec(select(User).where(User.nickname == nickname)).first().id


def _published_program(client, headers):
    program = _create_program(client, headers["Authorization"].split()[1])
    client.put(f"/programs/{program['id']}/draft", json=STRUCTURE, headers=headers)
    client.post(f"/programs/{program['id']}/publish", json={}, headers=headers)

    return program


def _entry(client, headers, program_id=None, day=TODAY, **extra):
    payload = {
        "date": day.isoformat(),
        "title": "Тренировка",
        "description": "",
        "tags": [],
        **({"program_id": program_id} if program_id else {}),
        **extra,
    }
    response = client.post("/diary/entries", json=payload, headers=headers)

    assert response.status_code == 200, response.text

    return response.json()


def _load(client, user_id, days=7, headers=None, end=TODAY):
    return client.get(
        "/diary/muscle-load",
        params={
            "user_id": user_id,
            "date_from": (end - timedelta(days=days - 1)).isoformat(),
            "date_to": end.isoformat(),
        },
        headers=headers or {},
    )


def test_muscles_come_from_scheme_exercises(client, session):
    user = register_user(client, nickname="athlete")
    headers = auth_headers(user["token"])
    program = _published_program(client, headers)
    _entry(
        client,
        headers,
        program["id"],
        program_section_id="sec-a",
        program_scheme_id="sch-a1",
    )

    response = _load(client, _user_id(session, "athlete"))

    assert response.status_code == 200, response.text
    body = response.json()
    target, auxiliary = _muscles(client, [PULLUPS])
    assert body["target"] == target
    assert body["auxiliary"] == auxiliary
    assert body["entries_total"] == 1
    assert body["entries_with_data"] == 1


def test_own_text_exercises_have_no_muscles_and_other_scheme_is_ignored(
    client, session
):
    user = register_user(client, nickname="athlete")
    headers = auth_headers(user["token"])
    program = _published_program(client, headers)
    _entry(
        client,
        headers,
        program["id"],
        program_section_id="sec-a",
        program_scheme_id="sch-a2",
    )

    body = _load(client, _user_id(session, "athlete")).json()

    # В схеме B из базы только «Отжимания на брусьях»; «Берпи» — текст.
    target, auxiliary = _muscles(client, [DIPS])
    assert body["target"] == target
    assert body["auxiliary"] == auxiliary


def test_entries_without_scheme_or_complex_give_empty_map(client, session):
    user = register_user(client, nickname="athlete")
    headers = auth_headers(user["token"])
    program = _published_program(client, headers)
    _entry(client, headers)  # без программы
    _entry(client, headers, program["id"])  # программа без схемы

    body = _load(client, _user_id(session, "athlete")).json()

    assert body["target"] == []
    assert body["auxiliary"] == []
    assert body["entries_total"] == 2
    assert body["entries_with_data"] == 0


def test_only_entries_inside_the_period_count(client, session):
    user = register_user(client, nickname="athlete")
    headers = auth_headers(user["token"])
    program = _published_program(client, headers)
    _entry(
        client,
        headers,
        program["id"],
        day=TODAY - timedelta(days=10),
        program_section_id="sec-a",
        program_scheme_id="sch-a1",
    )
    user_id = _user_id(session, "athlete")

    assert _load(client, user_id, days=7).json()["target"] == []
    assert _load(client, user_id, days=14).json()["target"] != []


def test_completed_complex_linked_to_entry_adds_its_muscles(client, session):
    user = register_user(client, nickname="athlete")
    headers = auth_headers(user["token"])
    entry = _entry(client, headers)

    created = client.post(
        f"/complexes/{COMPLEX_ID}/completions",
        json={
            "complex_id": COMPLEX_ID,
            "completed_date": TODAY.isoformat(),
            "diary_entry_id": entry["id"],
            "result_time_seconds": 1500,
        },
        headers=headers,
    )
    assert created.status_code == 200, created.text

    body = _load(client, _user_id(session, "athlete")).json()
    exercise_ids = client.get(f"/complexes/{COMPLEX_ID}").json()["exercise_ids"]
    target, auxiliary = _muscles(client, exercise_ids)

    assert body["target"] == target
    assert body["auxiliary"] == auxiliary
    assert body["entries_with_data"] == 1


def test_private_entries_are_hidden_from_other_viewers(client, session):
    author = register_user(client, nickname="author")
    author_headers = auth_headers(author["token"])
    program = _published_program(client, author_headers)
    _entry(
        client,
        author_headers,
        program["id"],
        program_section_id="sec-a",
        program_scheme_id="sch-a1",
        is_private=True,
    )
    other = register_user(client, nickname="other")
    author_id = _user_id(session, "author")

    for_other = _load(client, author_id, headers=auth_headers(other["token"])).json()
    for_author = _load(client, author_id, headers=author_headers).json()

    assert for_other["entries_total"] == 0
    assert for_other["target"] == []
    assert for_author["entries_total"] == 1
    assert for_author["target"] != []


def test_hidden_diary_is_forbidden_for_others(client, session):
    register_user(client, nickname="author")
    row = session.exec(select(User).where(User.nickname == "author")).first()
    row.diary_visible = False
    session.add(row)
    session.commit()
    other = register_user(client, nickname="other")

    assert _load(client, row.id, headers=auth_headers(other["token"])).status_code == 403
    assert _load(client, row.id).status_code == 403


def test_period_is_validated(client, session):
    register_user(client, nickname="athlete")
    user_id = _user_id(session, "athlete")

    too_long = _load(client, user_id, days=60)
    reversed_ = client.get(
        "/diary/muscle-load",
        params={
            "user_id": user_id,
            "date_from": TODAY.isoformat(),
            "date_to": (TODAY - timedelta(days=1)).isoformat(),
        },
    )

    assert too_long.status_code == 400
    assert reversed_.status_code == 400


def test_unknown_user_is_404(client):
    assert _load(client, 999999).status_code == 404
