"""
Тесты на _ensure_completed_date_is_not_future (app/routers/complexes.py) —
и при создании, и при редактировании выполнения нельзя указать дату
в будущем.
"""

from datetime import date, timedelta

from conftest import auth_headers, register_user

COMPLEX_ID = "hannibal-scheme-steel"

TOMORROW = (date.today() + timedelta(days=1)).isoformat()
TODAY = date.today().isoformat()
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()


def _create_workout_entry(session, user_id: int, entry_date: str) -> int:
    from datetime import date as date_cls

    from app.models_diary import WorkoutEntry

    entry = WorkoutEntry(
        date=date_cls.fromisoformat(entry_date),
        title="Тренировка для теста",
        user_id=user_id,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    return entry.id


def test_creating_completion_with_future_date_is_rejected(client, session):
    from sqlmodel import select

    from app.models import User

    user = register_user(client, nickname="athlete")
    db_user = session.exec(
        select(User).where(User.nickname == "athlete")
    ).first()

    entry_id = _create_workout_entry(session, db_user.id, TOMORROW)

    response = client.post(
        f"/complexes/{COMPLEX_ID}/completions",
        json={
            "complex_id": COMPLEX_ID,
            "completed_date": TOMORROW,
            "diary_entry_id": entry_id,
            "result_time_seconds": 2000,
        },
        headers=auth_headers(user["token"]),
    )

    assert response.status_code == 400


def test_creating_completion_with_today_or_past_date_is_allowed(client, session):
    from sqlmodel import select

    from app.models import User

    user = register_user(client, nickname="athlete")
    db_user = session.exec(
        select(User).where(User.nickname == "athlete")
    ).first()

    entry_id = _create_workout_entry(session, db_user.id, TODAY)

    response = client.post(
        f"/complexes/{COMPLEX_ID}/completions",
        json={
            "complex_id": COMPLEX_ID,
            "completed_date": TODAY,
            "diary_entry_id": entry_id,
            "result_time_seconds": 2000,
        },
        headers=auth_headers(user["token"]),
    )

    assert response.status_code == 200


def test_updating_completion_to_future_date_is_rejected(client, session):
    from sqlmodel import select

    from app.models import User

    user = register_user(client, nickname="athlete")
    db_user = session.exec(
        select(User).where(User.nickname == "athlete")
    ).first()

    entry_id = _create_workout_entry(session, db_user.id, YESTERDAY)

    created = client.post(
        f"/complexes/{COMPLEX_ID}/completions",
        json={
            "complex_id": COMPLEX_ID,
            "completed_date": YESTERDAY,
            "diary_entry_id": entry_id,
            "result_time_seconds": 2000,
        },
        headers=auth_headers(user["token"]),
    ).json()

    response = client.put(
        f"/complexes/completions/{created['id']}",
        json={"completed_date": TOMORROW},
        headers=auth_headers(user["token"]),
    )

    assert response.status_code == 400
