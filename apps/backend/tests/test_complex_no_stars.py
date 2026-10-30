"""
Звёзды из комплексов убраны: в API комплекса нет условий звёзд, в
выполнении нет числа звёзд, а лучший результат определяется только
основным показателем (для временных комплексов — меньшее время).
"""

from datetime import date, timedelta

from conftest import auth_headers, register_user

COMPLEX_ID = "hannibal-scheme-steel"

TODAY = date.today()
YESTERDAY = TODAY - timedelta(days=1)


def _create_workout_entry(session, user_id: int, entry_date: date) -> int:
    from app.models_diary import WorkoutEntry

    entry = WorkoutEntry(
        date=entry_date,
        title="Тренировка для теста",
        user_id=user_id,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    return entry.id


def _post_completion(client, token, entry_id, completed_date, seconds):
    return client.post(
        f"/complexes/{COMPLEX_ID}/completions",
        json={
            "complex_id": COMPLEX_ID,
            "completed_date": completed_date.isoformat(),
            "diary_entry_id": entry_id,
            "result_time_seconds": seconds,
        },
        headers=auth_headers(token),
    )


def _register_and_get_db_id(client, session):
    from sqlmodel import select

    from app.models import User

    user = register_user(client, nickname="athlete")
    db_user = session.exec(
        select(User).where(User.nickname == "athlete")
    ).first()

    return user, db_user.id


def test_complex_has_no_star_conditions(client):
    response = client.get(f"/complexes/{COMPLEX_ID}")

    assert response.status_code == 200
    assert "star_conditions" not in response.json()


def test_completion_has_no_stars(client, session):
    user, user_id = _register_and_get_db_id(client, session)
    entry_id = _create_workout_entry(session, user_id, TODAY)

    response = _post_completion(client, user["token"], entry_id, TODAY, 2000)

    assert response.status_code == 200
    assert "stars" not in response.json()


def test_best_completion_is_the_fastest_one(client, session):
    user, user_id = _register_and_get_db_id(client, session)
    slower_entry = _create_workout_entry(session, user_id, YESTERDAY)
    faster_entry = _create_workout_entry(session, user_id, TODAY)

    # Более быстрое выполнение внесено позже, более медленное — раньше;
    # лучшим должно быть быстрое независимо от порядка.
    assert _post_completion(
        client, user["token"], slower_entry, YESTERDAY, 2400
    ).status_code == 200
    assert _post_completion(
        client, user["token"], faster_entry, TODAY, 1500
    ).status_code == 200

    response = client.get(
        f"/complexes/{COMPLEX_ID}/best",
        headers=auth_headers(user["token"]),
    )

    assert response.status_code == 200
    assert response.json()["result_time_seconds"] == 1500
