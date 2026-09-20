"""Тесты кнопки «Скачать записи» на странице /diary."""

import io
import zipfile

from fastapi.testclient import TestClient

from tests.conftest import auth_headers, register_user


def test_export_contains_entries_and_notes_and_photo(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])

    client.post(
        "/diary/entries",
        json={
            "date": "2026-01-10",
            "title": "Тренировка",
            "description": "Подтягивания",
            "tags": ["турники"],
        },
        headers=headers,
    )

    client.post(
        "/diary/notes",
        json={"title": "Заметка", "text": "Текст заметки", "tags": []},
        headers=headers,
    )

    response = client.get("/diary/export", headers=headers)

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "diary-export.zip" in response.headers["content-disposition"]

    archive = zipfile.ZipFile(io.BytesIO(response.content))
    names = archive.namelist()
    assert "diary.txt" in names

    diary_text = archive.read("diary.txt").decode("utf-8")
    assert "Тренировка" in diary_text
    assert "Подтягивания" in diary_text
    assert "турники" in diary_text
    assert "Заметка" in diary_text
    assert "Текст заметки" in diary_text


def test_export_only_includes_own_entries(client: TestClient):
    alice = register_user(client, "alice")
    bob = register_user(client, "bob")

    client.post(
        "/diary/entries",
        json={
            "date": "2026-01-10",
            "title": "Тренировка Алисы",
            "description": "",
            "tags": [],
        },
        headers=auth_headers(alice["token"]),
    )

    response = client.get("/diary/export", headers=auth_headers(bob["token"]))
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    diary_text = archive.read("diary.txt").decode("utf-8")

    assert "Тренировка Алисы" not in diary_text
    assert "Всего записей: 0" in diary_text


def test_export_requires_authentication(client: TestClient):
    response = client.get("/diary/export")
    assert response.status_code == 401


def test_export_marks_private_entries(client: TestClient):
    user = register_user(client)
    headers = auth_headers(user["token"])

    client.post(
        "/diary/entries",
        json={
            "date": "2026-01-10",
            "title": "Личная тренировка",
            "description": "",
            "tags": [],
            "is_private": True,
        },
        headers=headers,
    )

    response = client.get("/diary/export", headers=headers)
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    diary_text = archive.read("diary.txt").decode("utf-8")

    assert "видимая только вам" in diary_text
