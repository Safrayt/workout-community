"""
Тесты на статьи (раздел "База знаний → Статьи"): app/models_article.py
и app/routers/articles.py.

Читать опубликованные статьи может кто угодно, а добавлять, править,
удалять, видеть черновики и загружать картинки — только администратор.
"""

import io

import pytest
from sqlmodel import select

from conftest import auth_headers, register_user

from app import files
from app.models import User
from app.models_article import (
    ArticleDB,
    ArticleTagDB,
    ArticleWrite,
    estimate_reading_minutes,
    normalize_tag,
)
from app.user_deletion import delete_user_completely

VALID_PAYLOAD = {
    "title": "Как начать подтягиваться",
    "summary": "С чего начать, если не получается ни одного повторения.",
    "body": "## Вступление\n\nПервый абзац статьи.",
    "category": "training",
    "tags": ["подтягивания", "новичкам"],
    "is_published": True,
}


def _make_admin(session, nickname: str) -> None:
    user = session.exec(select(User).where(User.nickname == nickname)).first()
    user.is_admin = True
    session.add(user)
    session.commit()


@pytest.fixture(name="admin")
def admin_fixture(client, session):
    user = register_user(client, nickname="admin_user")
    _make_admin(session, "admin_user")

    return auth_headers(user["token"])


@pytest.fixture(name="regular")
def regular_fixture(client):
    user = register_user(client, nickname="regular_user")

    return auth_headers(user["token"])


@pytest.fixture(name="upload_root")
def upload_root_fixture(tmp_path, monkeypatch):
    """Пишем в tmp_path, а не в настоящую uploads/ рядом с кодом."""
    monkeypatch.setattr(files, "UPLOAD_ROOT", tmp_path)
    (tmp_path / "articles").mkdir()

    return tmp_path


def _png_bytes() -> bytes:
    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (40, 30), "red").save(buffer, format="PNG")

    return buffer.getvalue()


def _upload_image(client, admin) -> str:
    response = client.post(
        "/articles/images",
        files={"file": ("pic.png", _png_bytes(), "image/png")},
        headers=admin,
    )

    assert response.status_code == 201, response.text

    return response.json()["url"]


def _create(client, admin, **overrides):
    response = client.post(
        "/articles/", json={**VALID_PAYLOAD, **overrides}, headers=admin
    )

    assert response.status_code == 201, response.text

    return response.json()


def _ids(response) -> list[str]:
    return [item["id"] for item in response.json()["items"]]


# ---------------------------------------------------------------------
# Права доступа
# ---------------------------------------------------------------------


def test_list_is_public_and_empty_at_start(client):
    response = client.get("/articles/")

    assert response.status_code == 200
    assert response.json() == {
        "items": [],
        "total": 0,
        "page": 1,
        "page_size": 12,
    }


def test_only_admin_can_write(client, regular):
    assert client.post("/articles/", json=VALID_PAYLOAD).status_code == 401

    response = client.post("/articles/", json=VALID_PAYLOAD, headers=regular)
    assert response.status_code == 403

    response = client.put(
        "/articles/any", json=VALID_PAYLOAD, headers=regular
    )
    assert response.status_code == 403

    response = client.delete("/articles/any", headers=regular)
    assert response.status_code == 403


def test_only_admin_can_upload_images(client, regular, upload_root):
    response = client.post(
        "/articles/images",
        files={"file": ("pic.png", _png_bytes(), "image/png")},
        headers=regular,
    )

    assert response.status_code == 403
    assert list((upload_root / "articles").iterdir()) == []


# ---------------------------------------------------------------------
# Создание, слаги, черновики
# ---------------------------------------------------------------------


def test_create_returns_full_article(client, admin):
    article = _create(client, admin)

    assert article["id"] == "kak-nachat-podtyagivatsya"
    assert article["title"] == VALID_PAYLOAD["title"]
    assert article["body"] == VALID_PAYLOAD["body"]
    assert article["category"] == "training"
    assert article["tags"] == ["новичкам", "подтягивания"]
    assert article["author_nickname"] == "admin_user"
    assert article["is_published"] is True
    assert article["published_at"] is not None
    assert article["reading_minutes"] == 1


def test_same_title_gets_numbered_slug(client, admin):
    first = _create(client, admin)
    second = _create(client, admin)

    assert first["id"] == "kak-nachat-podtyagivatsya"
    assert second["id"] == "kak-nachat-podtyagivatsya-2"


@pytest.mark.parametrize("title", ["Create", "Tags", "Images"])
def test_reserved_slugs_are_not_used(client, admin, title):
    article = _create(client, admin, title=title)

    assert article["id"] == f"{title.lower()}-2"


def test_draft_is_hidden_from_everyone_but_admin(client, admin, regular):
    draft = _create(
        client, admin, summary="", body="", is_published=False
    )

    assert draft["published_at"] is None

    # В общем списке черновика нет — ни у админа, ни у остальных.
    assert _ids(client.get("/articles/")) == []
    assert _ids(client.get("/articles/", headers=admin)) == []

    # Открыть по прямой ссылке может только админ; для остальных — 404.
    url = f"/articles/{draft['id']}"

    assert client.get(url).status_code == 404
    assert client.get(url, headers=regular).status_code == 404
    assert client.get(url, headers=admin).status_code == 200

    # Список черновиков — только админу.
    assert client.get("/articles/?status=draft").status_code == 403
    assert client.get("/articles/?status=draft", headers=regular).status_code == 403

    drafts = client.get("/articles/?status=draft", headers=admin)

    assert _ids(drafts) == [draft["id"]]


def test_cannot_publish_empty_article(client, admin):
    for payload in (
        {"summary": "", "body": "Текст"},
        {"summary": "Описание", "body": ""},
    ):
        response = client.post(
            "/articles/", json={**VALID_PAYLOAD, **payload}, headers=admin
        )

        assert response.status_code == 422


def test_publishing_sets_date_once(client, admin):
    draft = _create(client, admin, is_published=False)
    url = f"/articles/{draft['id']}"

    published = client.put(
        url, json={**VALID_PAYLOAD, "is_published": True}, headers=admin
    ).json()

    assert published["published_at"] is not None

    unpublished = client.put(
        url, json={**VALID_PAYLOAD, "is_published": False}, headers=admin
    ).json()

    assert unpublished["is_published"] is False
    assert client.get(url).status_code == 404

    republished = client.put(
        url, json={**VALID_PAYLOAD, "is_published": True}, headers=admin
    ).json()

    # Повторная публикация не "омолаживает" статью.
    assert republished["published_at"] == published["published_at"]


@pytest.mark.parametrize(
    "payload",
    [
        {"title": "   "},
        {"title": "я" * 151},
        {"summary": "я" * 301},
        {"category": "unknown"},
        {"body": "я" * 100_001},
    ],
)
def test_validation_rejects_bad_fields(client, admin, payload):
    response = client.post(
        "/articles/", json={**VALID_PAYLOAD, **payload}, headers=admin
    )

    assert response.status_code == 422


def test_nul_characters_are_stripped(client, admin):
    article = _create(client, admin, title="Ти\x00тул", body="Те\x00кст")

    assert article["title"] == "Титул"
    assert article["body"] == "Текст"


# ---------------------------------------------------------------------
# Хештеги
# ---------------------------------------------------------------------


def test_normalize_tag():
    assert normalize_tag("  #Подтягивания ") == "подтягивания"
    assert normalize_tag("Широким хватом") == "широким-хватом"
    assert normalize_tag("pull_ups-2") == "pull_ups-2"

    for bad in ("", "#", "   ", "а" * 31, "a,b", "a/b", "a<b>"):
        with pytest.raises(ValueError):
            normalize_tag(bad)


def test_tags_are_normalized_and_deduplicated(client, admin):
    article = _create(
        client,
        admin,
        tags=["#Питание", "питание", "Белок ", "", "  "],
    )

    assert article["tags"] == ["белок", "питание"]


def test_too_many_or_invalid_tags_are_rejected(client, admin):
    many = [f"тег{i}" for i in range(11)]

    for tags in (many, ["плохой,тег"]):
        response = client.post(
            "/articles/", json={**VALID_PAYLOAD, "tags": tags}, headers=admin
        )

        assert response.status_code == 422


def test_update_replaces_tags_and_keeps_slug(client, admin, session):
    article = _create(client, admin)

    response = client.put(
        f"/articles/{article['id']}",
        json={
            **VALID_PAYLOAD,
            "title": "Совсем другое название",
            "tags": ["подтягивания", "брусья"],
        },
        headers=admin,
    )

    assert response.status_code == 200

    updated = response.json()

    assert updated["id"] == article["id"]
    assert updated["title"] == "Совсем другое название"
    assert updated["tags"] == ["брусья", "подтягивания"]

    stored = session.exec(
        select(ArticleTagDB.tag).where(ArticleTagDB.article_id == article["id"])
    ).all()

    assert sorted(stored) == ["брусья", "подтягивания"]


def test_update_of_unknown_article_is_404(client, admin):
    response = client.put("/articles/nope", json=VALID_PAYLOAD, headers=admin)

    assert response.status_code == 404


# ---------------------------------------------------------------------
# Фильтры и пагинация
# ---------------------------------------------------------------------


@pytest.fixture(name="library")
def library_fixture(client, admin):
    """Четыре опубликованные статьи и один черновик."""
    articles = {
        "pull": _create(
            client, admin, title="Подтягивания", category="training",
            tags=["подтягивания", "турник"],
        ),
        "protein": _create(
            client, admin, title="Белок", category="nutrition",
            tags=["белок", "питание"],
        ),
        "chef": _create(
            client, admin, title="Интервью с поваром", category="interview",
            tags=["питание", "турник"],
        ),
        "sleep": _create(
            client, admin, title="Сон", category="recovery", tags=["сон"],
        ),
        "draft": _create(
            client, admin, title="Черновик", category="training",
            tags=["турник"], is_published=False,
        ),
    }

    return {key: value["id"] for key, value in articles.items()}


def test_list_is_newest_first_without_drafts(client, library):
    response = client.get("/articles/")

    assert response.json()["total"] == 4
    assert _ids(response) == [
        library["sleep"],
        library["chef"],
        library["protein"],
        library["pull"],
    ]


def test_filter_by_category(client, library):
    response = client.get("/articles/?category=nutrition")

    assert _ids(response) == [library["protein"]]

    # Черновик той же направленности в публичный список не попадает.
    assert _ids(client.get("/articles/?category=training")) == [library["pull"]]


def test_filter_by_tag_is_case_insensitive(client, library):
    response = client.get("/articles/?tag=%D0%9F%D0%B8%D1%82%D0%B0%D0%BD%D0%B8%D0%B5")

    assert sorted(_ids(response)) == sorted(
        [library["protein"], library["chef"]]
    )

    response = client.get("/articles/?tag=%23турник")

    assert sorted(_ids(response)) == sorted(
        [library["pull"], library["chef"]]
    )


def test_several_tags_are_combined_with_and(client, library):
    response = client.get("/articles/?tag=питание&tag=турник")

    assert _ids(response) == [library["chef"]]


def test_category_and_tag_combine(client, library):
    response = client.get("/articles/?category=interview&tag=питание")

    assert _ids(response) == [library["chef"]]

    response = client.get("/articles/?category=training&tag=питание")

    assert _ids(response) == []


def test_unknown_or_invalid_tag_gives_empty_list(client, library):
    for tag in ("нет-такого", "плохой,тег"):
        response = client.get("/articles/", params={"tag": tag})

        assert response.status_code == 200
        assert response.json()["total"] == 0


def test_unknown_category_and_status_are_422(client):
    assert client.get("/articles/?category=unknown").status_code == 422
    assert client.get("/articles/?status=all").status_code == 422


def test_pagination(client, library):
    first = client.get("/articles/?page_size=3").json()

    assert first["total"] == 4
    assert first["page"] == 1
    assert len(first["items"]) == 3

    second = client.get("/articles/?page_size=3&page=2").json()

    assert len(second["items"]) == 1
    assert second["items"][0]["id"] == library["pull"]

    assert client.get("/articles/?page_size=3&page=3").json()["items"] == []
    assert client.get("/articles/?page=0").status_code == 422
    assert client.get("/articles/?page_size=51").status_code == 422


def test_list_items_do_not_contain_body(client, library):
    item = client.get("/articles/").json()["items"][0]

    assert "body" not in item
    assert item["tags"] == ["сон"]


def test_tag_cloud_counts_only_published(client, library):
    response = client.get("/articles/tags")

    assert response.status_code == 200
    assert response.json() == [
        {"tag": "питание", "count": 2},
        # "турник" есть и у черновика, но он не считается.
        {"tag": "турник", "count": 2},
        {"tag": "белок", "count": 1},
        {"tag": "подтягивания", "count": 1},
        {"tag": "сон", "count": 1},
    ]

    response = client.get("/articles/tags?category=nutrition")

    assert [row["tag"] for row in response.json()] == ["белок", "питание"]


# ---------------------------------------------------------------------
# Удаление
# ---------------------------------------------------------------------


def test_delete_removes_article_and_tags(client, admin, session):
    article = _create(client, admin)

    assert client.delete(f"/articles/{article['id']}", headers=admin).status_code == 204
    assert client.get(f"/articles/{article['id']}").status_code == 404
    assert session.exec(select(ArticleTagDB)).all() == []
    assert client.delete(f"/articles/{article['id']}", headers=admin).status_code == 404


# ---------------------------------------------------------------------
# Картинки
# ---------------------------------------------------------------------


def test_upload_returns_url_and_saves_file(client, admin, upload_root):
    url = _upload_image(client, admin)

    assert url.startswith("/uploads/articles/")
    assert (upload_root / url.removeprefix("/uploads/")).is_file()


def test_upload_rejects_non_images(client, admin, upload_root):
    response = client.post(
        "/articles/images",
        files={"file": ("x.png", b"not an image", "image/png")},
        headers=admin,
    )

    assert response.status_code == 400
    assert list((upload_root / "articles").iterdir()) == []


def test_body_accepts_uploaded_image_and_rejects_foreign(
    client, admin, upload_root
):
    url = _upload_image(client, admin)

    ok = client.post(
        "/articles/",
        json={**VALID_PAYLOAD, "body": f"Текст\n\n![Схема]({url})"},
        headers=admin,
    )

    assert ok.status_code == 201

    for foreign in (
        "https://evil.example/pixel.png",
        "/uploads/articles/../../app.db",
        "/uploads/playgrounds/" + "a" * 32 + ".jpg",
        "javascript:alert(1)",
    ):
        response = client.post(
            "/articles/",
            json={**VALID_PAYLOAD, "body": f"![x]({foreign})"},
            headers=admin,
        )

        assert response.status_code == 422, foreign


def test_cover_must_be_uploaded_image(client, admin, upload_root):
    url = _upload_image(client, admin)

    assert _create(client, admin, cover_url=url)["cover_url"] == url

    for bad in ("https://evil.example/a.png", "/uploads/articles/x.png"):
        response = client.post(
            "/articles/",
            json={**VALID_PAYLOAD, "cover_url": bad},
            headers=admin,
        )

        assert response.status_code == 422


def test_removed_images_are_deleted_from_disk(client, admin, upload_root):
    in_text = _upload_image(client, admin)
    cover = _upload_image(client, admin)

    article = _create(
        client, admin, body=f"![a]({in_text})", cover_url=cover
    )
    url = f"/articles/{article['id']}"

    def on_disk(image_url: str) -> bool:
        return (upload_root / image_url.removeprefix("/uploads/")).exists()

    # Убрали картинку из текста — файл удалён, обложка осталась.
    client.put(
        url,
        json={**VALID_PAYLOAD, "body": "Без картинок", "cover_url": cover},
        headers=admin,
    )

    assert not on_disk(in_text)
    assert on_disk(cover)

    # Заменили обложку — старый файл удалён.
    new_cover = _upload_image(client, admin)

    client.put(
        url,
        json={**VALID_PAYLOAD, "cover_url": new_cover},
        headers=admin,
    )

    assert not on_disk(cover)
    assert on_disk(new_cover)

    # Удалили статью — удалены все её файлы.
    client.delete(url, headers=admin)

    assert not on_disk(new_cover)


def test_image_shared_by_two_articles_survives_until_both_are_gone(
    client, admin, upload_root
):
    shared = _upload_image(client, admin)
    body = f"![a]({shared})"

    first = _create(client, admin, title="Первая", body=body)
    second = _create(client, admin, title="Вторая", body=body)

    path = upload_root / shared.removeprefix("/uploads/")

    client.delete(f"/articles/{first['id']}", headers=admin)

    assert path.exists()

    client.delete(f"/articles/{second['id']}", headers=admin)

    assert not path.exists()


# ---------------------------------------------------------------------
# Остальное
# ---------------------------------------------------------------------


def test_reading_time_ignores_image_urls():
    assert estimate_reading_minutes("") == 0
    assert estimate_reading_minutes("Слово") == 1
    assert estimate_reading_minutes("слово " * 401) == 3

    long_url = "/uploads/articles/" + "a" * 32 + ".png"

    assert estimate_reading_minutes(f"![x]({long_url})") == 0


def test_write_model_trims_text():
    data = ArticleWrite(
        title="  Название  ", summary=" кратко ", body="\n текст \n",
        category="training", is_published=True,
    )

    assert (data.title, data.summary, data.body) == ("Название", "кратко", "текст")


def test_deleting_author_keeps_article(client, admin, session):
    article = _create(client, admin)

    author = session.exec(
        select(User).where(User.nickname == "admin_user")
    ).one()

    delete_user_completely(author, session)

    row = session.get(ArticleDB, article["id"])

    assert row is not None
    assert row.author_id is None

    fetched = client.get(f"/articles/{article['id']}").json()

    assert fetched["author_nickname"] is None
