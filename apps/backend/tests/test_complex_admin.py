"""
Тесты на POST/PUT /complexes/ (models_complex.ComplexDB) — каталог
комплексов раньше был статичным списком в коде, теперь администратор
может пополнять и редактировать его через API/форму на сайте.
Обычным пользователям — только читать (см. test_permissions.py и
существующие тесты на GET уже покрывают публичное чтение).
"""

from conftest import auth_headers, register_user

NEW_COMPLEX_PAYLOAD = {
    "id": "test-complex",
    "name": "Тестовый комплекс",
    "types": ["sets"],
    "description": "Комплекс, созданный тестом.",
    "scheme_display": "3×10",
    "movements": ["pull"],
    "exercise": "Подтягивания",
    "result_metrics": ["reps"],
    "star_conditions": [],
}


def _make_admin(session, nickname: str) -> None:
    from sqlmodel import select

    from app.models import User

    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.is_admin = True
    session.add(user)
    session.commit()


def test_creating_complex_requires_auth(client):
    response = client.post("/complexes/", json=NEW_COMPLEX_PAYLOAD)

    assert response.status_code == 401


def test_regular_user_cannot_create_complex(client):
    user = register_user(client, nickname="regular")

    response = client.post(
        "/complexes/",
        json=NEW_COMPLEX_PAYLOAD,
        headers=auth_headers(user["token"]),
    )

    assert response.status_code == 403


def test_admin_can_create_complex(client, session):
    admin = register_user(client, nickname="admin")
    _make_admin(session, "admin")

    response = client.post(
        "/complexes/",
        json=NEW_COMPLEX_PAYLOAD,
        headers=auth_headers(admin["token"]),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "test-complex"
    assert body["types"] == ["sets"]

    # И он реально появляется в общем каталоге, а не только в ответе
    # на сам запрос создания.
    list_response = client.get("/complexes/")
    ids = [item["id"] for item in list_response.json()]
    assert "test-complex" in ids


def test_admin_cannot_create_complex_with_duplicate_id(client, session):
    admin = register_user(client, nickname="admin")
    _make_admin(session, "admin")

    first = client.post(
        "/complexes/",
        json=NEW_COMPLEX_PAYLOAD,
        headers=auth_headers(admin["token"]),
    )
    assert first.status_code == 200

    second = client.post(
        "/complexes/",
        json=NEW_COMPLEX_PAYLOAD,
        headers=auth_headers(admin["token"]),
    )

    assert second.status_code == 400


def test_regular_user_cannot_update_complex(client, session):
    admin = register_user(client, nickname="admin")
    _make_admin(session, "admin")
    client.post(
        "/complexes/",
        json=NEW_COMPLEX_PAYLOAD,
        headers=auth_headers(admin["token"]),
    )

    other = register_user(client, nickname="regular")

    response = client.put(
        "/complexes/test-complex",
        json={"name": "Подделка"},
        headers=auth_headers(other["token"]),
    )

    assert response.status_code == 403


def test_admin_can_partially_update_complex(client, session):
    admin = register_user(client, nickname="admin")
    _make_admin(session, "admin")
    client.post(
        "/complexes/",
        json=NEW_COMPLEX_PAYLOAD,
        headers=auth_headers(admin["token"]),
    )

    response = client.put(
        "/complexes/test-complex",
        json={"name": "Обновлённое название"},
        headers=auth_headers(admin["token"]),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Обновлённое название"
    # Остальные поля, которые не передавались, не должны были
    # затереться значением по умолчанию.
    assert body["exercise"] == "Подтягивания"
    assert body["types"] == ["sets"]


def test_updating_unknown_complex_is_404(client, session):
    admin = register_user(client, nickname="admin")
    _make_admin(session, "admin")

    response = client.put(
        "/complexes/does-not-exist",
        json={"name": "Не важно"},
        headers=auth_headers(admin["token"]),
    )

    assert response.status_code == 404


def test_seeded_hannibal_complex_is_present_from_start(client):
    """
    Регрессия перехода со статичного списка на таблицу: посевные
    данные (см. seed_complexes_if_empty) должны попадать в базу сами,
    без ручного создания через API — иначе "Схема Ганнибала" молча
    исчезла бы у всех существующих сайтов при обновлении.
    """
    response = client.get("/complexes/hannibal-scheme-steel")

    assert response.status_code == 200
    assert response.json()["name"] == "Схема Ганнибала"
