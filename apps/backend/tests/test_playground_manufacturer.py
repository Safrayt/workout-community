"""
Производитель оборудования площадки: название и (необязательно) ссылка
на сайт. Ссылки показываются всем как кликабельные, а площадки
добавляют обычные пользователи, поэтому принимаются только http/https.
"""

import pytest

from conftest import auth_headers, register_user

PAYLOAD = {
    "name": "Площадка с производителем",
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


def _create(client, token, **overrides):
    return client.post(
        "/playgrounds/",
        json={**PAYLOAD, **overrides},
        headers=auth_headers(token),
    )


def _update(client, token, playground_id, **fields):
    return client.put(
        f"/playgrounds/{playground_id}",
        json=fields,
        headers=auth_headers(token),
    )


@pytest.fixture(name="owner")
def owner_fixture(client):
    return register_user(client, nickname="manufacturer_owner")


def test_playground_without_manufacturer(client, owner):
    response = _create(client, owner["token"])

    assert response.status_code == 200, response.text
    created = response.json()
    assert created["manufacturer_name"] is None
    assert created["manufacturer_url"] is None


def test_playground_with_manufacturer_and_link(client, owner):
    response = _create(
        client,
        owner["token"],
        manufacturer_name="  Спорт-Мастер ",
        manufacturer_url="https://example.com/catalog",
    )

    assert response.status_code == 200, response.text
    created = response.json()
    assert created["manufacturer_name"] == "Спорт-Мастер"
    assert created["manufacturer_url"] == "https://example.com/catalog"

    detail = client.get(f"/playgrounds/{created['id']}").json()
    assert detail["manufacturer_name"] == "Спорт-Мастер"
    assert detail["manufacturer_url"] == "https://example.com/catalog"


def test_manufacturer_name_without_link_is_allowed(client, owner):
    response = _create(client, owner["token"], manufacturer_name="Kompan")

    assert response.status_code == 200, response.text
    assert response.json()["manufacturer_url"] is None


def test_link_without_scheme_gets_https(client, owner):
    response = _create(
        client,
        owner["token"],
        manufacturer_name="Kompan",
        manufacturer_url="example.com",
    )

    assert response.status_code == 200, response.text
    assert response.json()["manufacturer_url"] == "https://example.com"


def test_empty_strings_mean_no_manufacturer(client, owner):
    response = _create(
        client,
        owner["token"],
        manufacturer_name="   ",
        manufacturer_url="",
    )

    assert response.status_code == 200, response.text
    created = response.json()
    assert created["manufacturer_name"] is None
    assert created["manufacturer_url"] is None


def test_link_without_name_is_rejected(client, owner):
    response = _create(
        client, owner["token"], manufacturer_url="https://example.com"
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "mailto:a@example.com",
        "ftp://example.com",
        "https://site.com@evil.com",
        "https://exa mple.com",
        "https://localhost",
    ],
)
def test_dangerous_or_invalid_links_are_rejected(client, owner, url):
    response = _create(
        client,
        owner["token"],
        manufacturer_name="Kompan",
        manufacturer_url=url,
    )

    assert response.status_code == 422


def test_too_long_name_is_rejected(client, owner):
    response = _create(client, owner["token"], manufacturer_name="я" * 101)

    assert response.status_code == 422


def test_manufacturer_can_be_set_changed_and_cleared(client, owner):
    playground_id = _create(client, owner["token"]).json()["id"]

    response = _update(
        client,
        owner["token"],
        playground_id,
        manufacturer_name="Kompan",
        manufacturer_url="https://kompan.example.com",
    )
    assert response.status_code == 200, response.text
    assert response.json()["manufacturer_name"] == "Kompan"

    response = _update(
        client,
        owner["token"],
        playground_id,
        manufacturer_name=None,
        manufacturer_url=None,
    )
    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["manufacturer_name"] is None
    assert updated["manufacturer_url"] is None


def test_history_has_one_manufacturer_entry_for_name_and_link(client, owner):
    playground_id = _create(client, owner["token"]).json()["id"]

    response = _update(
        client,
        owner["token"],
        playground_id,
        manufacturer_name="Kompan",
        manufacturer_url="https://kompan.example.com",
    )

    edits = [
        entry
        for entry in response.json()["history"]
        if entry["type"] == "edit"
    ]
    assert len(edits) == 1
    assert edits[0]["changed_fields"] == ["Производитель"]


def test_update_link_needs_a_name_on_the_playground(client, owner):
    playground_id = _create(client, owner["token"]).json()["id"]

    # Названия у площадки нет, а в запросе только ссылка.
    response = _update(
        client,
        owner["token"],
        playground_id,
        manufacturer_url="https://example.com",
    )
    assert response.status_code == 422

    # Название уже есть — достаточно прислать одну ссылку.
    _update(client, owner["token"], playground_id, manufacturer_name="Kompan")
    response = _update(
        client,
        owner["token"],
        playground_id,
        manufacturer_url="https://example.com",
    )
    assert response.status_code == 200, response.text
    assert response.json()["manufacturer_url"] == "https://example.com"


def test_name_cannot_be_cleared_while_link_stays(client, owner):
    playground_id = _create(
        client,
        owner["token"],
        manufacturer_name="Kompan",
        manufacturer_url="https://example.com",
    ).json()["id"]

    response = _update(
        client, owner["token"], playground_id, manufacturer_name=None
    )

    assert response.status_code == 422
