"""
Раздел и схема программы в записи дневника: выбираются из реальной
структуры зафиксированной версии, а не вводятся вручную. Сервер хранит
id (для будущей карты мышц по упражнениям схемы) и подставляет названия
из структуры.
"""

from fastapi.testclient import TestClient

from tests.conftest import auth_headers, register_user
from tests.test_programs import _create_program

STRUCTURE = {
    "sections": [
        {
            "id": "sec-a",
            "name": "Неделя 1",
            "schemes": [
                {"id": "sch-a1", "name": "Тренировка A", "blocks": []},
                {"id": "sch-a2", "name": "Тренировка B", "blocks": []},
            ],
        },
        {
            "id": "sec-b",
            "name": "Неделя 2",
            "schemes": [{"id": "sch-b1", "name": "Тренировка C", "blocks": []}],
        },
    ]
}


def _published_program(client: TestClient, headers: dict, structure=STRUCTURE):
    program = _create_program(client, headers["Authorization"].split()[1])
    client.put(f"/programs/{program['id']}/draft", json=structure, headers=headers)
    version = client.post(
        f"/programs/{program['id']}/publish", json={}, headers=headers
    ).json()

    return program, version


def _entry_payload(program_id, **extra) -> dict:
    return {
        "date": "2026-11-20",
        "title": "Тренировка",
        "description": "",
        "tags": [],
        "program_id": program_id,
        **extra,
    }


def test_section_and_scheme_names_come_from_structure(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])
    program, _ = _published_program(client, headers)

    response = client.post(
        "/diary/entries",
        json=_entry_payload(
            program["id"],
            program_section_id="sec-a",
            program_scheme_id="sch-a2",
            # Присланный текст при наличии id игнорируется.
            program_section="что-то своё",
            program_scheme="тоже своё",
        ),
        headers=headers,
    )

    assert response.status_code == 200, response.text
    entry = response.json()
    assert entry["program_section_id"] == "sec-a"
    assert entry["program_scheme_id"] == "sch-a2"
    assert entry["program_section"] == "Неделя 1"
    assert entry["program_scheme"] == "Тренировка B"


def test_only_section_can_be_selected(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])
    program, _ = _published_program(client, headers)

    entry = client.post(
        "/diary/entries",
        json=_entry_payload(program["id"], program_section_id="sec-b"),
        headers=headers,
    ).json()

    assert entry["program_section"] == "Неделя 2"
    assert entry["program_scheme_id"] is None
    assert entry["program_scheme"] is None


def test_unknown_section_or_scheme_is_rejected(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])
    program, _ = _published_program(client, headers)

    cases = [
        {"program_section_id": "net-takogo"},
        {"program_section_id": "sec-a", "program_scheme_id": "sch-b1"},
        {"program_scheme_id": "sch-a1"},
    ]

    for extra in cases:
        response = client.post(
            "/diary/entries",
            json=_entry_payload(program["id"], **extra),
            headers=headers,
        )

        assert response.status_code == 400, (extra, response.text)


def test_fallback_ids_work_for_structure_without_saved_ids(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])
    structure = {
        "sections": [
            {"name": None, "schemes": [{"name": "Тренировка A", "blocks": []}]}
        ]
    }
    program, _ = _published_program(client, headers, structure)

    entry = client.post(
        "/diary/entries",
        json=_entry_payload(
            program["id"],
            program_section_id="section-1",
            program_scheme_id="scheme-1-1",
        ),
        headers=headers,
    ).json()

    assert entry["program_section"] is None
    assert entry["program_scheme"] == "Тренировка A"


def test_text_without_ids_is_still_accepted_for_old_clients(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])
    program, _ = _published_program(client, headers)

    entry = client.post(
        "/diary/entries",
        json=_entry_payload(program["id"], program_scheme="Моя схема"),
        headers=headers,
    ).json()

    assert entry["program_scheme"] == "Моя схема"
    assert entry["program_scheme_id"] is None


def test_editing_entry_keeps_its_version_and_selection(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])
    program, v1 = _published_program(client, headers)

    entry = client.post(
        "/diary/entries",
        json=_entry_payload(
            program["id"],
            program_section_id="sec-a",
            program_scheme_id="sch-a1",
        ),
        headers=headers,
    ).json()

    # Программа обновилась: в новой версии таких раздела и схемы уже нет.
    client.put(
        f"/programs/{program['id']}/draft",
        json={"sections": [{"id": "new", "name": "Новое", "schemes": []}]},
        headers=headers,
    )
    client.post(
        f"/programs/{program['id']}/publish",
        json={"changelog": "Правки"},
        headers=headers,
    )

    # Форма при сохранении присылает программу и выбор целиком.
    response = client.put(
        f"/diary/entries/{entry['id']}",
        json={
            "title": "Новое название",
            "program_id": program["id"],
            "program_section_id": "sec-a",
            "program_scheme_id": "sch-a1",
        },
        headers=headers,
    )

    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["program_version_id"] == v1["id"]
    assert updated["program_scheme"] == "Тренировка A"


def test_changing_program_resets_section_and_scheme(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])
    first, _ = _published_program(client, headers)
    second, _ = _published_program(client, headers)

    entry = client.post(
        "/diary/entries",
        json=_entry_payload(
            first["id"],
            program_section_id="sec-a",
            program_scheme_id="sch-a1",
        ),
        headers=headers,
    ).json()

    updated = client.put(
        f"/diary/entries/{entry['id']}",
        json={"program_id": second["id"]},
        headers=headers,
    ).json()

    assert updated["program_id"] == second["id"]
    assert updated["program_section_id"] is None
    assert updated["program_scheme_id"] is None


def test_clear_program_clears_section_and_scheme(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])
    program, _ = _published_program(client, headers)

    entry = client.post(
        "/diary/entries",
        json=_entry_payload(
            program["id"],
            program_section_id="sec-a",
            program_scheme_id="sch-a1",
        ),
        headers=headers,
    ).json()

    updated = client.put(
        f"/diary/entries/{entry['id']}",
        json={"clear_program": True},
        headers=headers,
    ).json()

    assert updated["program_id"] is None
    assert updated["program_section_id"] is None
    assert updated["program_scheme_id"] is None
    assert updated["program_scheme"] is None
