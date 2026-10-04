"""
Тесты на базу упражнений (раздел "База знаний → Упражнения"):
app/models_exercise.py и app/routers/exercises.py.

Читать упражнения может кто угодно, добавлять, править, удалять и
загружать к ним фото/видео — только администратор.
"""

import pytest
from sqlmodel import select

from conftest import auth_headers, register_user

from app import files
from app.models_exercise import (
    ExerciseDB,
    ExerciseWrite,
    load_seed_exercises,
    seed_exercises_if_empty,
    slugify,
)

# Минимальное упражнение, проходящее проверку.
VALID_PAYLOAD = {
    "name": "Тестовое упражнение",
    "movement_type": "pull",
    "target_muscles": ["lats"],
    "auxiliary_muscles": ["biceps"],
    "equipment": ["Турник"],
    "description": "Описание тестового упражнения.",
    "technique": ["Шаг первый", "Шаг второй"],
}

# Допустимый MP4: 4 байта размера, "ftyp", бренд "isom" и немного данных.
VALID_MP4 = b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00isomiso2" + b"\x00" * 64


def _make_admin(session, nickname: str) -> None:
    from app.models import User

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
    (tmp_path / "exercises").mkdir()

    return tmp_path


def _png_bytes() -> bytes:
    import io

    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (40, 30), "red").save(buffer, format="PNG")

    return buffer.getvalue()


def _create(client, admin, **overrides):
    response = client.post(
        "/exercises/", json={**VALID_PAYLOAD, **overrides}, headers=admin
    )

    assert response.status_code == 201, response.text

    return response.json()


# ---------------------------------------------------------------------
# Стартовые данные
# ---------------------------------------------------------------------


def test_list_is_public_and_contains_seed(client):
    response = client.get("/exercises/")

    assert response.status_code == 200

    exercises = response.json()
    ids = [exercise["id"] for exercise in exercises]

    assert len(exercises) == 24
    assert ids[0] == "pullups-wide"
    assert len(set(ids)) == 24


def test_seed_keeps_media_and_text_blocks(client):
    pillar = client.get("/exercises/pillar-pull-ups").json()

    assert pillar["name"] == "Подтягивания к столбу"
    assert pillar["name_en"] == "Pillar Pull-Ups"
    assert pillar["movement_type"] == "pull"
    assert pillar["video_url"] == "/exercises/videos/pillar-pull-ups.mp4"
    assert pillar["photo_url"] is None
    assert len(pillar["technique"]) == 4
    assert len(pillar["advantages"]) == 3

    front_lever = client.get("/exercises/front-lever").json()

    assert front_lever["photo_url"] == "/exercises/front-lever.jpg"


def test_every_seed_exercise_passes_validation():
    for seed in load_seed_exercises():
        ExerciseWrite(**{key: seed[key] for key in ExerciseWrite.model_fields})

        for url in (seed.get("photo_url"), seed.get("video_url")):
            # Стартовые файлы — статика фронтенда, не /uploads/.
            assert url is None or url.startswith("/exercises/")


def test_seed_runs_only_on_empty_table(session):
    assert len(session.exec(select(ExerciseDB)).all()) == 24

    seed_exercises_if_empty(session)

    assert len(session.exec(select(ExerciseDB)).all()) == 24

    # Удалили одно — повторный запуск (рестарт) его не возвращает.
    session.delete(session.get(ExerciseDB, "squats"))
    session.commit()

    seed_exercises_if_empty(session)

    assert session.get(ExerciseDB, "squats") is None
    assert len(session.exec(select(ExerciseDB)).all()) == 23


def test_get_unknown_exercise_is_404(client):
    assert client.get("/exercises/no-such-exercise").status_code == 404


# ---------------------------------------------------------------------
# Права
# ---------------------------------------------------------------------


def test_write_endpoints_require_authentication(client):
    assert client.post("/exercises/", json=VALID_PAYLOAD).status_code == 401
    assert client.put("/exercises/squats", json=VALID_PAYLOAD).status_code == 401
    assert client.delete("/exercises/squats").status_code == 401


def test_regular_user_cannot_write(client, regular):
    assert (
        client.post("/exercises/", json=VALID_PAYLOAD, headers=regular).status_code
        == 403
    )
    assert (
        client.put("/exercises/squats", json=VALID_PAYLOAD, headers=regular).status_code
        == 403
    )
    assert client.delete("/exercises/squats", headers=regular).status_code == 403

    # Упражнение на месте.
    assert client.get("/exercises/squats").status_code == 200


def test_regular_user_cannot_upload_media(client, regular, upload_root):
    photo = client.put(
        "/exercises/squats/photo",
        files={"file": ("a.png", _png_bytes(), "image/png")},
        headers=regular,
    )
    video = client.put(
        "/exercises/squats/video",
        files={"file": ("a.mp4", VALID_MP4, "video/mp4")},
        headers=regular,
    )

    assert photo.status_code == 403
    assert video.status_code == 403
    assert client.delete("/exercises/squats/photo", headers=regular).status_code == 403
    assert client.delete("/exercises/squats/video", headers=regular).status_code == 403


# ---------------------------------------------------------------------
# Добавление
# ---------------------------------------------------------------------


def test_admin_creates_exercise(client, admin):
    created = _create(client, admin)

    assert created["id"] == "testovoe-uprazhnenie"
    assert created["name"] == "Тестовое упражнение"
    assert created["movement_type"] == "pull"
    assert created["target_muscles"] == ["lats"]
    assert created["photo_url"] is None
    assert created["video_url"] is None

    # Видно всем и стоит в конце списка.
    listing = client.get("/exercises/").json()

    assert listing[-1]["id"] == "testovoe-uprazhnenie"
    assert len(listing) == 25


def test_slug_prefers_english_name(client, admin):
    created = _create(client, admin, name_en="Archer Pull-Ups")

    assert created["id"] == "archer-pull-ups"


def test_slug_is_unique(client, admin):
    first = _create(client, admin)
    second = _create(client, admin)
    third = _create(client, admin)

    assert [first["id"], second["id"], third["id"]] == [
        "testovoe-uprazhnenie",
        "testovoe-uprazhnenie-2",
        "testovoe-uprazhnenie-3",
    ]


def test_slug_cannot_take_reserved_create(client, admin):
    """/knowledge/exercises/create — страница добавления, а не упражнение."""
    created = _create(client, admin, name="Create")

    assert created["id"] == "create-2"


def test_slug_falls_back_when_name_has_no_letters(client, admin):
    assert _create(client, admin, name="!!!")["id"] == "exercise"


def test_slugify():
    assert slugify("Подтягивания к столбу") == "podtyagivaniya-k-stolbu"
    assert slugify("Pillar Pull-Ups") == "pillar-pull-ups"
    assert slugify("  Щёлк / Ъ  ") == "schelk"
    assert len(slugify("а" * 200)) <= 60


def test_text_fields_are_trimmed_and_cleaned(client, admin):
    created = _create(
        client,
        admin,
        name="  Пробелы  ",
        name_en="   ",
        target_muscles=["lats", "lats"],
        equipment=["  Турник ", "", "   "],
        advantages=["Первое", "  ", "Второе  "],
    )

    assert created["name"] == "Пробелы"
    assert created["name_en"] is None
    assert created["target_muscles"] == ["lats"]
    assert created["equipment"] == ["Турник"]
    assert created["advantages"] == ["Первое", "Второе"]


@pytest.mark.parametrize(
    "overrides",
    [
        {"name": ""},
        {"name": "   "},
        {"name": "а" * 121},
        {"name_en": "a" * 121},
        {"movement_type": "unknown"},
        {"target_muscles": []},
        {"target_muscles": ["unknown"]},
        {"auxiliary_muscles": ["unknown"]},
        {"target_muscles": ["lats"], "auxiliary_muscles": ["lats"]},
        {"equipment": []},
        {"equipment": ["", "  "]},
        {"description": ""},
        {"description": "а" * 2001},
        {"technique": []},
        {"technique": ["  "]},
        {"technique": ["шаг"] * 21},
        {"advantages": ["а" * 501]},
    ],
)
def test_invalid_payload_is_rejected(client, admin, overrides):
    response = client.post(
        "/exercises/", json={**VALID_PAYLOAD, **overrides}, headers=admin
    )

    assert response.status_code == 422, overrides
    # Ничего не сохранилось.
    assert len(client.get("/exercises/").json()) == 24


def test_media_urls_cannot_be_set_through_create(client, admin):
    created = _create(
        client,
        admin,
        photo_url="https://evil.example/x.jpg",
        video_url="/uploads/../../etc/passwd",
    )

    assert created["photo_url"] is None
    assert created["video_url"] is None


# ---------------------------------------------------------------------
# Редактирование
# ---------------------------------------------------------------------


def test_admin_updates_exercise_keeping_id_media_and_position(client, admin):
    before = client.get("/exercises/").json()
    position = [e["id"] for e in before].index("pillar-pull-ups")

    response = client.put(
        "/exercises/pillar-pull-ups",
        json={**VALID_PAYLOAD, "name": "Новое название", "name_en": "New name"},
        headers=admin,
    )

    assert response.status_code == 200

    updated = response.json()

    assert updated["id"] == "pillar-pull-ups"
    assert updated["name"] == "Новое название"
    assert updated["name_en"] == "New name"
    assert updated["technique"] == ["Шаг первый", "Шаг второй"]
    # Видео не трогается обычным сохранением текста.
    assert updated["video_url"] == "/exercises/videos/pillar-pull-ups.mp4"

    after = client.get("/exercises/").json()

    assert [e["id"] for e in after].index("pillar-pull-ups") == position


def test_update_clears_optional_blocks(client, admin):
    response = client.put(
        "/exercises/pillar-pull-ups",
        json={**VALID_PAYLOAD, "advantages": [], "name_en": None},
        headers=admin,
    )

    updated = response.json()

    assert updated["advantages"] == []
    assert updated["name_en"] is None


def test_update_validates_like_create(client, admin):
    response = client.put(
        "/exercises/squats",
        json={**VALID_PAYLOAD, "target_muscles": []},
        headers=admin,
    )

    assert response.status_code == 422
    assert client.get("/exercises/squats").json()["target_muscles"] == [
        "quads",
        "glutes",
    ]


def test_update_unknown_exercise_is_404(client, admin):
    response = client.put("/exercises/nope", json=VALID_PAYLOAD, headers=admin)

    assert response.status_code == 404


# ---------------------------------------------------------------------
# Удаление
# ---------------------------------------------------------------------


def test_admin_deletes_exercise(client, admin):
    assert client.delete("/exercises/squats", headers=admin).status_code == 204
    assert client.get("/exercises/squats").status_code == 404
    assert "squats" not in [e["id"] for e in client.get("/exercises/").json()]


def test_delete_unknown_exercise_is_404(client, admin):
    assert client.delete("/exercises/nope", headers=admin).status_code == 404


def test_delete_removes_uploaded_files(client, admin, upload_root):
    created = _create(client, admin)
    exercise_id = created["id"]

    photo = client.put(
        f"/exercises/{exercise_id}/photo",
        files={"file": ("a.png", _png_bytes(), "image/png")},
        headers=admin,
    ).json()["photo_url"]
    video = client.put(
        f"/exercises/{exercise_id}/video",
        files={"file": ("a.mp4", VALID_MP4, "video/mp4")},
        headers=admin,
    ).json()["video_url"]

    photo_path = upload_root / photo.removeprefix("/uploads/")
    video_path = upload_root / video.removeprefix("/uploads/")

    assert photo_path.exists() and video_path.exists()

    assert client.delete(f"/exercises/{exercise_id}", headers=admin).status_code == 204

    assert not photo_path.exists()
    assert not video_path.exists()


def test_delete_seed_exercise_with_static_media_does_not_touch_files(
    client, admin, upload_root
):
    """У стартовых упражнений медиа — статика фронтенда (/exercises/...)."""
    marker = upload_root / "exercises" / "keep.txt"
    marker.write_text("x")

    assert client.delete("/exercises/front-lever", headers=admin).status_code == 204
    assert client.delete("/exercises/pillar-pull-ups", headers=admin).status_code == 204
    assert marker.exists()


# ---------------------------------------------------------------------
# Фото
# ---------------------------------------------------------------------


def test_upload_photo(client, admin, upload_root):
    exercise_id = _create(client, admin)["id"]

    response = client.put(
        f"/exercises/{exercise_id}/photo",
        files={"file": ("a.png", _png_bytes(), "image/png")},
        headers=admin,
    )

    assert response.status_code == 200

    url = response.json()["photo_url"]

    assert url.startswith("/uploads/exercises/")
    assert (upload_root / url.removeprefix("/uploads/")).exists()
    assert client.get(f"/exercises/{exercise_id}").json()["photo_url"] == url


def test_replacing_photo_deletes_the_previous_file(client, admin, upload_root):
    exercise_id = _create(client, admin)["id"]

    def upload():
        return client.put(
            f"/exercises/{exercise_id}/photo",
            files={"file": ("a.png", _png_bytes(), "image/png")},
            headers=admin,
        ).json()["photo_url"]

    first, second = upload(), upload()

    assert first != second
    assert not (upload_root / first.removeprefix("/uploads/")).exists()
    assert (upload_root / second.removeprefix("/uploads/")).exists()


def test_delete_photo(client, admin, upload_root):
    exercise_id = _create(client, admin)["id"]
    url = client.put(
        f"/exercises/{exercise_id}/photo",
        files={"file": ("a.png", _png_bytes(), "image/png")},
        headers=admin,
    ).json()["photo_url"]

    response = client.delete(f"/exercises/{exercise_id}/photo", headers=admin)

    assert response.status_code == 200
    assert response.json()["photo_url"] is None
    assert not (upload_root / url.removeprefix("/uploads/")).exists()


def test_delete_static_seed_photo_only_unlinks_it(client, admin, upload_root):
    response = client.delete("/exercises/front-lever/photo", headers=admin)

    assert response.status_code == 200
    assert response.json()["photo_url"] is None


def test_non_image_is_rejected_as_photo(client, admin, upload_root):
    response = client.put(
        "/exercises/squats/photo",
        files={"file": ("a.jpg", b"<html>not an image</html>", "image/jpeg")},
        headers=admin,
    )

    assert response.status_code == 400
    assert client.get("/exercises/squats").json()["photo_url"] is None


def test_photo_for_unknown_exercise_is_404(client, admin, upload_root):
    response = client.put(
        "/exercises/nope/photo",
        files={"file": ("a.png", _png_bytes(), "image/png")},
        headers=admin,
    )

    assert response.status_code == 404


# ---------------------------------------------------------------------
# Видео
# ---------------------------------------------------------------------


def test_upload_video(client, admin, upload_root):
    exercise_id = _create(client, admin)["id"]

    response = client.put(
        f"/exercises/{exercise_id}/video",
        files={"file": ("clip.mp4", VALID_MP4, "video/mp4")},
        headers=admin,
    )

    assert response.status_code == 200

    url = response.json()["video_url"]

    assert url.startswith("/uploads/exercises/") and url.endswith(".mp4")
    assert (upload_root / url.removeprefix("/uploads/")).read_bytes() == VALID_MP4


def test_video_type_is_decided_by_content_not_name(client, admin, upload_root):
    exercise_id = _create(client, admin)["id"]

    # Имя и Content-Type правильные, а внутри не MP4.
    fake = client.put(
        f"/exercises/{exercise_id}/video",
        files={"file": ("clip.mp4", b"<script>alert(1)</script>" * 5, "video/mp4")},
        headers=admin,
    )
    # QuickTime .mov (бренд "qt  ") — отклоняем, многие браузеры его не играют.
    mov = client.put(
        f"/exercises/{exercise_id}/video",
        files={
            "file": (
                "clip.mp4",
                b"\x00\x00\x00\x14ftypqt  \x00\x00\x00\x00" + b"\x00" * 32,
                "video/mp4",
            )
        },
        headers=admin,
    )
    tiny = client.put(
        f"/exercises/{exercise_id}/video",
        files={"file": ("clip.mp4", b"abc", "video/mp4")},
        headers=admin,
    )

    assert fake.status_code == 400
    assert mov.status_code == 400
    assert tiny.status_code == 400
    assert client.get(f"/exercises/{exercise_id}").json()["video_url"] is None
    assert list((upload_root / "exercises").iterdir()) == []


def test_video_size_limit(client, admin, upload_root):
    exercise_id = _create(client, admin)["id"]
    too_big = VALID_MP4 + b"\x00" * files.MAX_VIDEO_SIZE_BYTES

    response = client.put(
        f"/exercises/{exercise_id}/video",
        files={"file": ("clip.mp4", too_big, "video/mp4")},
        headers=admin,
    )

    assert response.status_code == 400
    assert "25 МБ" in response.json()["detail"]
    assert list((upload_root / "exercises").iterdir()) == []


def test_replacing_and_deleting_video(client, admin, upload_root):
    exercise_id = _create(client, admin)["id"]

    def upload():
        return client.put(
            f"/exercises/{exercise_id}/video",
            files={"file": ("clip.mp4", VALID_MP4, "video/mp4")},
            headers=admin,
        ).json()["video_url"]

    first, second = upload(), upload()

    assert not (upload_root / first.removeprefix("/uploads/")).exists()
    assert (upload_root / second.removeprefix("/uploads/")).exists()

    response = client.delete(f"/exercises/{exercise_id}/video", headers=admin)

    assert response.status_code == 200
    assert response.json()["video_url"] is None
    assert not (upload_root / second.removeprefix("/uploads/")).exists()


def test_editing_text_keeps_uploaded_media(client, admin, upload_root):
    exercise_id = _create(client, admin)["id"]
    url = client.put(
        f"/exercises/{exercise_id}/video",
        files={"file": ("clip.mp4", VALID_MP4, "video/mp4")},
        headers=admin,
    ).json()["video_url"]

    client.put(
        f"/exercises/{exercise_id}",
        json={**VALID_PAYLOAD, "name": "Другое имя"},
        headers=admin,
    )

    assert client.get(f"/exercises/{exercise_id}").json()["video_url"] == url
    assert (upload_root / url.removeprefix("/uploads/")).exists()
