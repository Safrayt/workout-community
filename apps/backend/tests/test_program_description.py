"""
Описание программы в Markdown (как текст статьи): ограничения на входе,
загрузка картинок автором и уборка ненужных файлов с диска.
"""

import io

import pytest

from app import files
from conftest import auth_headers, register_user


@pytest.fixture(name="upload_root")
def upload_root_fixture(tmp_path, monkeypatch):
    """Пишем в tmp_path, а не в настоящую uploads/ рядом с кодом."""
    monkeypatch.setattr(files, "UPLOAD_ROOT", tmp_path)
    (tmp_path / "program-descriptions").mkdir()

    return tmp_path


@pytest.fixture(name="author")
def author_fixture(client):
    return auth_headers(register_user(client, nickname="author")["token"])


@pytest.fixture(name="stranger")
def stranger_fixture(client):
    return auth_headers(register_user(client, nickname="stranger")["token"])


def _png_bytes() -> bytes:
    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (40, 30), "red").save(buffer, format="PNG")

    return buffer.getvalue()


def _create_program(client, headers, **overrides) -> dict:
    response = client.post(
        "/programs/", json={"title": "Моя программа", **overrides}, headers=headers
    )

    assert response.status_code == 200, response.text

    return response.json()


def _upload(client, headers, program_id: int) -> str:
    response = client.post(
        f"/programs/{program_id}/images",
        files={"file": ("pic.png", _png_bytes(), "image/png")},
        headers=headers,
    )

    assert response.status_code == 201, response.text

    return response.json()["url"]


def _files(upload_root) -> list[str]:
    return sorted(path.name for path in (upload_root / "program-descriptions").iterdir())


def _update(client, headers, program_id: int, description: str):
    return client.put(
        f"/programs/{program_id}",
        json={"description": description},
        headers=headers,
    )


def test_markdown_description_is_saved_as_written(client, author):
    text = "## Для кого\n\n**Новичкам** — [ссылка](https://example.com)\n\n- раз\n- два"

    program = _create_program(client, author, description=text)

    assert program["description"] == text
    assert client.get(f"/programs/{program['id']}", headers=author).json()["description"] == text


def test_old_plain_text_description_still_works(client, author):
    program = _create_program(client, author, description="Просто текст\nв две строки")

    assert program["description"] == "Просто текст\nв две строки"


def test_upload_returns_address_in_program_descriptions_folder(
    client, author, upload_root
):
    program = _create_program(client, author)

    url = _upload(client, author, program["id"])

    assert url.startswith("/uploads/program-descriptions/")
    assert len(_files(upload_root)) == 1


def test_only_author_can_upload_images(client, author, stranger, upload_root):
    program = _create_program(client, author)

    response = client.post(
        f"/programs/{program['id']}/images",
        files={"file": ("pic.png", _png_bytes(), "image/png")},
        headers=stranger,
    )

    assert response.status_code == 403
    assert _files(upload_root) == []


def test_upload_rejects_non_images(client, author, upload_root):
    program = _create_program(client, author)

    response = client.post(
        f"/programs/{program['id']}/images",
        files={"file": ("x.png", b"not an image", "image/png")},
        headers=author,
    )

    assert response.status_code == 400
    assert _files(upload_root) == []


def test_description_accepts_uploaded_image_and_rejects_foreign(
    client, author, upload_root
):
    program = _create_program(client, author)
    url = _upload(client, author, program["id"])

    ok = _update(client, author, program["id"], f"Текст\n\n![Схема]({url})")
    assert ok.status_code == 200, ok.text

    for foreign in (
        "https://evil.example/pixel.png",
        "/uploads/program-descriptions/../../app.db",
        "/uploads/articles/" + "a" * 32 + ".jpg",
        "javascript:alert(1)",
    ):
        response = _update(client, author, program["id"], f"![x]({foreign})")

        assert response.status_code == 422, foreign


def test_foreign_image_is_rejected_on_creation_too(client, author):
    response = client.post(
        "/programs/",
        json={"title": "Программа", "description": "![x](https://evil.example/a.png)"},
        headers=author,
    )

    assert response.status_code == 422


def test_too_long_description_is_rejected(client, author):
    program = _create_program(client, author)

    response = _update(client, author, program["id"], "а" * 30_001)

    assert response.status_code == 422


def test_image_removed_from_text_is_deleted_from_disk(client, author, upload_root):
    program = _create_program(client, author)
    kept = _upload(client, author, program["id"])
    removed = _upload(client, author, program["id"])

    _update(client, author, program["id"], f"![a]({kept})\n\n![b]({removed})")
    assert len(_files(upload_root)) == 2

    response = _update(client, author, program["id"], f"![a]({kept})")

    assert response.status_code == 200, response.text
    assert _files(upload_root) == [kept.rsplit("/", 1)[1]]


def test_image_used_by_another_program_is_not_deleted(client, author, upload_root):
    first = _create_program(client, author, title="Первая")
    second = _create_program(client, author, title="Вторая")
    url = _upload(client, author, first["id"])

    _update(client, author, first["id"], f"![a]({url})")
    _update(client, author, second["id"], f"![a]({url})")

    _update(client, author, first["id"], "Без картинки")

    assert len(_files(upload_root)) == 1


def test_images_are_deleted_with_the_program(client, author, upload_root):
    program = _create_program(client, author)
    url = _upload(client, author, program["id"])
    _update(client, author, program["id"], f"![a]({url})")

    response = client.delete(f"/programs/{program['id']}", headers=author)

    assert response.status_code == 204
    assert _files(upload_root) == []


def test_update_without_description_keeps_it_and_images(client, author, upload_root):
    program = _create_program(client, author)
    url = _upload(client, author, program["id"])
    _update(client, author, program["id"], f"![a]({url})")

    response = client.put(
        f"/programs/{program['id']}", json={"title": "Другое имя"}, headers=author
    )

    assert response.status_code == 200, response.text
    assert response.json()["description"] == f"![a]({url})"
    assert len(_files(upload_root)) == 1
