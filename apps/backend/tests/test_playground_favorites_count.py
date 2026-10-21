"""
favorites_count в PlaygroundRead — число "подписчиков" площадки.

Раньше фронтенд считал его сам по GET /favorites, а тот отдаёт только
избранное текущего пользователя, так что число было 0 или 1 независимо
от того, сколько людей на самом деле добавили площадку. Теперь его
считает сервер; эти тесты в первую очередь проверяют, что чужие
подписки учитываются.
"""

from conftest import auth_headers, register_user

PLAYGROUND_PAYLOAD = {
    "name": "Турник у дома",
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
}


def _create_playground(client, token, name="Турник у дома"):
    response = client.post(
        "/playgrounds/",
        json={**PLAYGROUND_PAYLOAD, "name": name},
        headers=auth_headers(token),
    )
    assert response.status_code == 200, response.text
    return response.json()


def _favorite(client, user, playground_id):
    response = client.post(
        f"/favorites/{playground_id}", headers=auth_headers(user["token"])
    )
    assert response.status_code == 200, response.text


def _unfavorite(client, user, playground_id):
    response = client.delete(
        f"/favorites/{playground_id}", headers=auth_headers(user["token"])
    )
    assert response.status_code == 204, response.text


def _count_in_detail(client, playground_id, token=None):
    headers = auth_headers(token) if token else None
    response = client.get(f"/playgrounds/{playground_id}", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()["favorites_count"]


def _count_in_list(client, playground_id):
    response = client.get("/playgrounds/")
    assert response.status_code == 200, response.text
    by_id = {item["id"]: item["favorites_count"] for item in response.json()}
    return by_id[playground_id]


def test_new_playground_has_no_subscribers(client):
    owner = register_user(client, nickname="owner")
    playground = _create_playground(client, owner["token"])

    assert playground["favorites_count"] == 0
    assert _count_in_detail(client, playground["id"]) == 0
    assert _count_in_list(client, playground["id"]) == 0


def test_counts_subscribers_of_all_users_not_only_current(client):
    """Главный регресс: GET /favorites показывает только своё."""
    owner = register_user(client, nickname="owner")
    alice = register_user(client, nickname="alice")
    bob = register_user(client, nickname="bob")
    playground = _create_playground(client, owner["token"])

    _favorite(client, alice, playground["id"])
    _favorite(client, bob, playground["id"])

    # Каждый видит 2, а не "1, если сам подписан".
    assert _count_in_detail(client, playground["id"], alice["token"]) == 2
    assert _count_in_detail(client, playground["id"], bob["token"]) == 2
    assert _count_in_detail(client, playground["id"], owner["token"]) == 2
    assert _count_in_list(client, playground["id"]) == 2

    # А личный список по-прежнему только свой (на нём держатся
    # "Мои избранные" и форма дневника).
    own = client.get("/favorites", headers=auth_headers(alice["token"]))
    assert len(own.json()) == 1


def test_guest_sees_subscribers_count(client):
    owner = register_user(client, nickname="owner")
    alice = register_user(client, nickname="alice")
    playground = _create_playground(client, owner["token"])
    _favorite(client, alice, playground["id"])

    assert _count_in_detail(client, playground["id"]) == 1
    assert _count_in_list(client, playground["id"]) == 1


def test_count_is_per_playground(client):
    owner = register_user(client, nickname="owner")
    alice = register_user(client, nickname="alice")
    bob = register_user(client, nickname="bob")
    first = _create_playground(client, owner["token"], "Первая")
    second = _create_playground(client, owner["token"], "Вторая")
    third = _create_playground(client, owner["token"], "Третья")

    _favorite(client, alice, first["id"])
    _favorite(client, bob, first["id"])
    _favorite(client, bob, second["id"])

    assert _count_in_list(client, first["id"]) == 2
    assert _count_in_list(client, second["id"]) == 1
    assert _count_in_list(client, third["id"]) == 0


def test_repeated_favorite_by_same_user_counts_once(client):
    owner = register_user(client, nickname="owner")
    alice = register_user(client, nickname="alice")
    playground = _create_playground(client, owner["token"])

    _favorite(client, alice, playground["id"])
    _favorite(client, alice, playground["id"])

    assert _count_in_detail(client, playground["id"]) == 1


def test_count_goes_down_when_unfavorited(client):
    owner = register_user(client, nickname="owner")
    alice = register_user(client, nickname="alice")
    bob = register_user(client, nickname="bob")
    playground = _create_playground(client, owner["token"])
    _favorite(client, alice, playground["id"])
    _favorite(client, bob, playground["id"])

    _unfavorite(client, alice, playground["id"])

    assert _count_in_detail(client, playground["id"]) == 1
    assert _count_in_list(client, playground["id"]) == 1

    # Повторное удаление и удаление без подписки ничего не ломают.
    _unfavorite(client, alice, playground["id"])
    assert _count_in_detail(client, playground["id"]) == 1


def test_deleted_account_is_not_counted(client):
    owner = register_user(client, nickname="owner")
    alice = register_user(client, nickname="alice")
    playground = _create_playground(client, owner["token"])
    _favorite(client, alice, playground["id"])
    assert _count_in_detail(client, playground["id"]) == 1

    response = client.post(
        "/users/me/delete",
        json={"password": alice["password"]},
        headers=auth_headers(alice["token"]),
    )
    assert response.status_code == 204, response.text

    assert _count_in_detail(client, playground["id"]) == 0


def test_count_is_present_in_every_playground_response(client):
    """Создание, обновление и подтверждение проверки тоже отдают его."""
    owner = register_user(client, nickname="owner")
    alice = register_user(client, nickname="alice")
    playground = _create_playground(client, owner["token"])
    _favorite(client, alice, playground["id"])

    updated = client.put(
        f"/playgrounds/{playground['id']}",
        json={**PLAYGROUND_PAYLOAD, "description": "Обновлено"},
        headers=auth_headers(owner["token"]),
    )
    confirmed = client.post(
        f"/playgrounds/{playground['id']}/confirm-inspection",
        headers=auth_headers(alice["token"]),
    )

    assert updated.status_code == 200, updated.text
    assert updated.json()["favorites_count"] == 1
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["favorites_count"] == 1
