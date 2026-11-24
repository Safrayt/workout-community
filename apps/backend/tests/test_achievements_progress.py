"""
Тесты достижений: каталог (названия и описания) и подсчёт прогресса по
записям дневника и площадкам — «Айс!» и «Отморозки в поиске свежести»
(температура), «У меня есть план» и «Выполнение плана…» (записи с
программой), «Турист» … «Пилигрим» (добавленные площадки) и «Это моё
болото» (много тренировок на одной площадке).
"""

from datetime import date

from sqlmodel import select

from app.models import User
from app.models_achievement import ACHIEVEMENTS
from app.models_diary import WorkoutEntry
from tests.conftest import auth_headers, register_user


def _user_id(session, nickname: str) -> int:
    return session.exec(select(User).where(User.nickname == nickname)).first().id


def _progress(client, user_id: int, token: str | None = None) -> dict:
    headers = auth_headers(token) if token else {}
    response = client.get(
        f"/achievements/progress?user_id={user_id}", headers=headers
    )
    assert response.status_code == 200, response.text

    return {item["achievement"]["id"]: item for item in response.json()}


def _create_playground(client, token: str, name: str) -> int:
    response = client.post(
        "/playgrounds/",
        json={
            "name": name,
            "locality": "Рига",
            "address": "ул. Тестовая, 1",
            "latitude": 56.95,
            "longitude": 24.10,
            "size": "medium",
            "surface": "rubber",
            "access": "free",
            "condition": "acceptable",
            "opening_hours": "круглосуточно",
            "equipment": [],
        },
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text

    return response.json()["id"]


def _create_program(client, token: str) -> int:
    response = client.post(
        "/programs/",
        json={"title": "Сила на турниках"},
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text

    return response.json()["id"]


def _add_entries(session, user_id: int, count: int = 1, **fields) -> None:
    for _ in range(count):
        session.add(
            WorkoutEntry(
                date=date.today(),
                title="Тренировка",
                user_id=user_id,
                **fields,
            )
        )

    session.commit()


# --- Каталог ---------------------------------------------------------------


def test_catalog_has_new_achievements():
    by_id = {a.id: a for a in ACHIEVEMENTS}

    expected = {
        "ice": ("Айс!", "Тренировка при -10 градусах."),
        "freshness-seekers": (
            "Отморозки в поиске свежести",
            "Тренировка при -20 градусах.",
        ),
        "have-a-plan": (
            "У меня есть план",
            "10 тренировочных записей с отмеченной программой тренировок.",
        ),
        "plan-is-duty": (
            "Выполнение плана - долг, перевыполнение - честь",
            "50 тренировочных записей с отмеченной программой тренировок.",
        ),
        "tourist": ("Турист", "10 площадок добавлено."),
        "traveler": ("Путешественник", "25 площадок добавлено."),
        "cartographer": ("Картограф", "50 площадок добавлено."),
        "pilgrim": ("Пилигрим", "100 площадок добавлено."),
        "my-swamp": (
            "Это моё болото",
            "Провести 100 тренировок на одной площадке.",
        ),
    }

    for achievement_id, (title, description) in expected.items():
        assert by_id[achievement_id].title == title
        assert by_id[achievement_id].description == description

    # Старые четыре никуда не делись, id уникальны.
    assert len(ACHIEVEMENTS) == 13
    assert len({a.id for a in ACHIEVEMENTS}) == 13


def test_catalog_endpoint_returns_all_achievements(client):
    response = client.get("/achievements/")

    assert response.status_code == 200
    assert len(response.json()) == 13


def test_new_user_has_no_new_achievements(client, session):
    register_user(client, "newbie")

    progress = _progress(client, _user_id(session, "newbie"))

    assert len(progress) == 13
    assert not any(item["unlocked"] for item in progress.values())
    assert all(item["progress"] == 0 for item in progress.values())


# --- Температура -----------------------------------------------------------


def test_cold_workouts_unlock_temperature_achievements(client, session):
    register_user(client, "frosty")
    user_id = _user_id(session, "frosty")

    # Не холодно / температура неизвестна — не считаются.
    _add_entries(session, user_id, temperature_c=-9.9)
    _add_entries(session, user_id, temperature_c=5.0)
    _add_entries(session, user_id, temperature_c=None)

    progress = _progress(client, user_id)
    assert progress["ice"]["unlocked"] is False
    assert progress["ice"]["progress"] == 0
    assert progress["freshness-seekers"]["unlocked"] is False

    # Ровно -10 — это уже «Айс!», но ещё не «Отморозки».
    _add_entries(session, user_id, temperature_c=-10.0)

    progress = _progress(client, user_id)
    assert progress["ice"]["unlocked"] is True
    assert progress["freshness-seekers"]["unlocked"] is False

    # -20 и холоднее — засчитывается в оба достижения.
    _add_entries(session, user_id, temperature_c=-20.0)

    progress = _progress(client, user_id)
    assert progress["ice"]["unlocked"] is True
    assert progress["ice"]["progress"] == 2
    assert progress["freshness-seekers"]["unlocked"] is True
    assert progress["freshness-seekers"]["progress"] == 1


def test_only_minus_20_unlocks_both_temperature_achievements(client, session):
    register_user(client, "polar")
    user_id = _user_id(session, "polar")

    _add_entries(session, user_id, temperature_c=-31.5)

    progress = _progress(client, user_id)

    assert progress["ice"]["unlocked"] is True
    assert progress["freshness-seekers"]["unlocked"] is True


# --- Программы -------------------------------------------------------------


def test_workouts_with_program_unlock_plan_achievements(client, session):
    user = register_user(client, "planner")
    user_id = _user_id(session, "planner")
    program_id = _create_program(client, user["token"])

    # Записи без программы в счёт не идут.
    _add_entries(session, user_id, count=20)
    _add_entries(session, user_id, count=9, program_id=program_id)

    progress = _progress(client, user_id)
    assert progress["have-a-plan"]["progress"] == 9
    assert progress["have-a-plan"]["unlocked"] is False

    _add_entries(session, user_id, program_id=program_id)

    progress = _progress(client, user_id)
    assert progress["have-a-plan"]["progress"] == 10
    assert progress["have-a-plan"]["unlocked"] is True
    assert progress["plan-is-duty"]["unlocked"] is False

    _add_entries(session, user_id, count=40, program_id=program_id)

    progress = _progress(client, user_id)
    assert progress["plan-is-duty"]["progress"] == 50
    assert progress["plan-is-duty"]["unlocked"] is True


# --- Площадки --------------------------------------------------------------


def test_created_playgrounds_unlock_tourist_but_not_traveler(client, session):
    user = register_user(client, "wanderer")
    user_id = _user_id(session, "wanderer")

    for number in range(9):
        _create_playground(client, user["token"], f"Площадка {number}")

    progress = _progress(client, user_id)
    assert progress["tourist"]["progress"] == 9
    assert progress["tourist"]["unlocked"] is False

    _create_playground(client, user["token"], "Площадка 9")

    progress = _progress(client, user_id)
    assert progress["tourist"]["unlocked"] is True
    assert progress["traveler"]["unlocked"] is False
    assert progress["traveler"]["progress"] == 10


def test_playground_achievement_targets():
    targets = {
        a.id: a.target
        for a in ACHIEVEMENTS
        if a.condition.value == "created-playgrounds"
    }

    assert targets == {
        "first-playground": 1,
        "tourist": 10,
        "traveler": 25,
        "cartographer": 50,
        "pilgrim": 100,
    }


def test_hundred_workouts_on_one_playground_unlock_my_swamp(client, session):
    user = register_user(client, "swamper")
    user_id = _user_id(session, "swamper")
    first = _create_playground(client, user["token"], "Болото")
    second = _create_playground(client, user["token"], "Другая")

    # 99 + 50 записей: всего больше 100, но на одной площадке — 99.
    _add_entries(session, user_id, count=99, playground_id=first)
    _add_entries(session, user_id, count=50, playground_id=second)
    # Записи без площадки не считаются ни за одну.
    _add_entries(session, user_id, count=10)

    progress = _progress(client, user_id)
    assert progress["my-swamp"]["progress"] == 99
    assert progress["my-swamp"]["unlocked"] is False

    _add_entries(session, user_id, playground_id=first)

    progress = _progress(client, user_id)
    assert progress["my-swamp"]["progress"] == 100
    assert progress["my-swamp"]["unlocked"] is True


# --- Чьи записи и приватность ---------------------------------------------


def test_progress_counts_only_that_users_entries(client, session):
    register_user(client, "owner")
    register_user(client, "other")
    owner_id = _user_id(session, "owner")
    other_id = _user_id(session, "other")

    _add_entries(session, other_id, temperature_c=-25.0)

    assert _progress(client, owner_id)["ice"]["unlocked"] is False
    assert _progress(client, other_id)["ice"]["unlocked"] is True


def test_private_entries_still_count_for_achievements(client, session):
    register_user(client, "secretive")
    user_id = _user_id(session, "secretive")

    # Запись скрыта настройкой приватности записи, но тренировка была.
    _add_entries(session, user_id, temperature_c=-12.0, is_private=True)

    assert _progress(client, user_id)["ice"]["unlocked"] is True


def test_hidden_achievements_are_not_shown_to_strangers(client, session):
    owner = register_user(client, "hider")
    stranger = register_user(client, "stranger")
    owner_id = _user_id(session, "hider")

    user = session.get(User, owner_id)
    user.achievements_visible = False
    session.add(user)
    session.commit()

    denied = client.get(
        f"/achievements/progress?user_id={owner_id}",
        headers=auth_headers(stranger["token"]),
    )
    assert denied.status_code == 403

    allowed = client.get(
        f"/achievements/progress?user_id={owner_id}",
        headers=auth_headers(owner["token"]),
    )
    assert allowed.status_code == 200
