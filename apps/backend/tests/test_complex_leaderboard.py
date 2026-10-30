"""
GET /complexes/{id}/leaderboard и /leaderboard/all — рейтинг комплекса.

Очки пользователя — значение основного показателя его лучшего
выполнения (больше лучше; для временных комплексов меньше лучше).
"""

from datetime import date, timedelta

import pytest
from sqlmodel import select

from app.models import User
from app.models_complex import (
    ComplexCompletion,
    ComplexDB,
    ComplexLeaderboardRow,
)
from app.routers.complexes import _compact_leaderboard
from conftest import auth_headers, register_user

TIME_COMPLEX_ID = "hannibal-scheme-steel"  # временной: меньше — лучше
REPS_COMPLEX_ID = "three-addends"  # объёмный: больше — лучше


@pytest.fixture(name="reps_complex")
def reps_complex_fixture(session):
    """Объёмный комплекс (результат — повторения), как «Три слагаемых»."""
    row = session.get(ComplexDB, TIME_COMPLEX_ID)
    session.add(
        ComplexDB(
            **{
                **row.model_dump(),
                "id": REPS_COMPLEX_ID,
                "result_metrics": ["reps"],
            }
        )
    )
    session.commit()


def _add_user(client, session, nickname: str) -> int:
    """
    Пользователь прямо в базе: регистрация через API ограничена по
    частоте (rate limit), а здесь их нужно много.
    """
    user = User(nickname=nickname, password_hash="not-a-real-hash")
    session.add(user)
    session.commit()
    session.refresh(user)

    return user.id


def _add_result(
    session,
    user_id: int,
    complex_id: str,
    *,
    reps: int | None = None,
    seconds: int | None = None,
    days_ago: int = 0,
) -> None:
    session.add(
        ComplexCompletion(
            complex_id=complex_id,
            user_id=user_id,
            completed_date=date.today() - timedelta(days=days_ago),
            result_reps=reps,
            result_time_seconds=seconds,
        )
    )
    session.commit()


def _board(client, complex_id=REPS_COMPLEX_ID, token=None, suffix=""):
    headers = auth_headers(token) if token else {}

    response = client.get(f"/complexes/{complex_id}/leaderboard{suffix}", headers=headers)

    assert response.status_code == 200, response.text

    return response.json()


def _lines(board):
    return [(r["rank"], r["nickname"], r["value"]) for r in board["rows"]]


def _row(rank, user_id, is_me=False):
    return ComplexLeaderboardRow(
        rank=rank, user_id=user_id, nickname=f"u{rank}", value=100 - rank, is_me=is_me
    )


# --- _compact_leaderboard: три примера из задания -------------------------


def test_compact_shows_top_five_me_and_last():
    ranked = [_row(r, r, is_me=(r == 18)) for r in range(1, 56)]

    assert [r.rank for r in _compact_leaderboard(ranked)] == [1, 2, 3, 4, 5, 18, 55]


def test_compact_when_me_in_top_five_shows_six_rows():
    ranked = [_row(r, r, is_me=(r == 5)) for r in range(1, 56)]

    assert [r.rank for r in _compact_leaderboard(ranked)] == [1, 2, 3, 4, 5, 55]


def test_compact_when_me_is_last_shows_six_rows():
    ranked = [_row(r, r, is_me=(r == 55)) for r in range(1, 56)]

    assert [r.rank for r in _compact_leaderboard(ranked)] == [1, 2, 3, 4, 5, 55]


def test_compact_without_me_shows_top_five_and_last():
    ranked = [_row(r, r) for r in range(1, 56)]

    assert [r.rank for r in _compact_leaderboard(ranked)] == [1, 2, 3, 4, 5, 55]


@pytest.mark.parametrize("count", [0, 1, 3, 5])
def test_compact_with_up_to_five_participants_shows_all(count):
    ranked = [_row(r, r) for r in range(1, count + 1)]

    assert [r.rank for r in _compact_leaderboard(ranked)] == list(range(1, count + 1))


def test_compact_with_six_participants_shows_all_of_them():
    ranked = [_row(r, r, is_me=(r == 6)) for r in range(1, 7)]

    assert [r.rank for r in _compact_leaderboard(ranked)] == [1, 2, 3, 4, 5, 6]


# --- Эндпоинт -------------------------------------------------------------


def test_leaderboard_of_unknown_complex_is_404(client):
    assert client.get("/complexes/no-such/leaderboard").status_code == 404
    assert client.get("/complexes/no-such/leaderboard/all").status_code == 404


def test_empty_leaderboard(client, reps_complex):
    assert _board(client) == {"total": 0, "rows": []}


def test_ranks_by_most_points_and_keeps_best_result_of_each_user(
    client, session, reps_complex
):
    tupac = _add_user(client, session, "tupac")
    rapuk = _add_user(client, session, "rapuk")

    _add_result(session, rapuk, REPS_COMPLEX_ID, reps=170)
    _add_result(session, tupac, REPS_COMPLEX_ID, reps=120)
    _add_result(session, tupac, REPS_COMPLEX_ID, reps=190)  # лучший
    _add_result(session, tupac, REPS_COMPLEX_ID, reps=150)

    board = _board(client)

    assert board["total"] == 2
    assert _lines(board) == [(1, "tupac", 190), (2, "rapuk", 170)]


def test_equal_points_the_earlier_result_ranks_higher(client, session, reps_complex):
    late = _add_user(client, session, "late")
    early = _add_user(client, session, "early")

    _add_result(session, late, REPS_COMPLEX_ID, reps=140, days_ago=1)
    _add_result(session, early, REPS_COMPLEX_ID, reps=140, days_ago=10)

    assert _lines(_board(client)) == [(1, "early", 140), (2, "late", 140)]


def test_time_based_complex_ranks_by_least_time(client, session):
    slow = _add_user(client, session, "slow")
    fast = _add_user(client, session, "fast")

    _add_result(session, slow, TIME_COMPLEX_ID, seconds=400)
    _add_result(session, fast, TIME_COMPLEX_ID, seconds=250)
    _add_result(session, fast, TIME_COMPLEX_ID, seconds=300)

    assert _lines(_board(client, TIME_COMPLEX_ID)) == [
        (1, "fast", 250),
        (2, "slow", 400),
    ]


def test_completions_without_the_ranking_metric_are_ignored(
    client, session, reps_complex
):
    user = _add_user(client, session, "athlete")

    _add_result(session, user, REPS_COMPLEX_ID, seconds=100)  # нет повторений

    assert _board(client)["rows"] == []


def _eight_users_and_viewer(client, session, viewer_reps: int) -> str:
    """Восемь участников с 190, 180, … 120 повторениями и зритель с viewer_reps."""
    for position in range(1, 9):
        user_id = _add_user(client, session, f"user{position}")
        _add_result(session, user_id, REPS_COMPLEX_ID, reps=200 - position * 10)

    token = register_user(client, nickname="viewer")["token"]
    viewer_id = session.exec(select(User).where(User.nickname == "viewer")).first().id
    _add_result(session, viewer_id, REPS_COMPLEX_ID, reps=viewer_reps)

    return token


def test_compact_board_when_active_user_is_in_top_five(client, session, reps_complex):
    token = _eight_users_and_viewer(client, session, viewer_reps=155)  # 5-е место

    board = _board(client, token=token)

    assert board["total"] == 9
    # Пятёрка (зритель в ней) и последний — шесть строк.
    assert _lines(board) == [
        (1, "user1", 190),
        (2, "user2", 180),
        (3, "user3", 170),
        (4, "user4", 160),
        (5, "viewer", 155),
        (9, "user8", 120),
    ]
    assert [r["nickname"] for r in board["rows"] if r["is_me"]] == ["viewer"]


def test_compact_board_when_active_user_is_outside_top_five(client, session, reps_complex):
    token = _eight_users_and_viewer(client, session, viewer_reps=135)  # 7-е место

    board = _board(client, token=token)

    assert board["total"] == 9
    # Пятёрка, сам пользователь и последний — семь строк.
    assert _lines(board) == [
        (1, "user1", 190),
        (2, "user2", 180),
        (3, "user3", 170),
        (4, "user4", 160),
        (5, "user5", 150),
        (7, "viewer", 135),
        (9, "user8", 120),
    ]
    assert [r["nickname"] for r in board["rows"] if r["is_me"]] == ["viewer"]


def test_compact_board_when_active_user_is_last(client, session, reps_complex):
    token = _eight_users_and_viewer(client, session, viewer_reps=100)  # последнее

    board = _board(client, token=token)

    assert board["total"] == 9
    # Пятёрка и сам пользователь (он же последний) — шесть строк.
    assert _lines(board) == [
        (1, "user1", 190),
        (2, "user2", 180),
        (3, "user3", 170),
        (4, "user4", 160),
        (5, "user5", 150),
        (9, "viewer", 100),
    ]


def test_guest_sees_leaderboard_without_own_row(client, session, reps_complex):
    user = _add_user(client, session, "athlete")
    _add_result(session, user, REPS_COMPLEX_ID, reps=35)

    board = _board(client)

    assert _lines(board) == [(1, "athlete", 35)]
    assert not any(r["is_me"] for r in board["rows"])


def test_full_leaderboard_is_paginated(client, session, reps_complex):
    for position in range(1, 8):
        user_id = _add_user(client, session, f"user{position}")
        _add_result(session, user_id, REPS_COMPLEX_ID, reps=100 - position)

    first = client.get(
        f"/complexes/{REPS_COMPLEX_ID}/leaderboard/all?limit=3&offset=0"
    ).json()
    second = client.get(
        f"/complexes/{REPS_COMPLEX_ID}/leaderboard/all?limit=3&offset=3"
    ).json()

    assert first["total"] == second["total"] == 7
    assert [r["rank"] for r in first["rows"]] == [1, 2, 3]
    assert [r["rank"] for r in second["rows"]] == [4, 5, 6]


def test_full_leaderboard_marks_current_user(client, session, reps_complex):
    first = _add_user(client, session, "first")
    token = register_user(client, nickname="me")["token"]
    me_id = session.exec(select(User).where(User.nickname == "me")).first().id

    _add_result(session, first, REPS_COMPLEX_ID, reps=50)
    _add_result(session, me_id, REPS_COMPLEX_ID, reps=40)

    board = _board(client, token=token, suffix="/all")

    assert [(r["nickname"], r["is_me"]) for r in board["rows"]] == [
        ("first", False),
        ("me", True),
    ]
