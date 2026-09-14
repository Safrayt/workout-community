"""
Тесты на app/files.py — ресайз/сжатие изображений при загрузке и
базовую валидацию (см. аудит "сырых мест", пункт про uploads/).

Не гоняются через HTTP-эндпоинты (это потребовало бы multipart-запросов
с реальными файлами для каждого роутера, где есть загрузка) — вместо
этого дёргают save_image() напрямую, она у всех роутеров общая.
"""

import io

import pytest
from PIL import Image, ImageDraw
from starlette.datastructures import UploadFile

from app import files


@pytest.fixture(autouse=True)
def _use_tmp_upload_root(tmp_path, monkeypatch):
    """Пишем в tmp_path, а не в настоящую uploads/ рядом с кодом."""
    monkeypatch.setattr(files, "UPLOAD_ROOT", tmp_path)
    files.ensure_upload_dirs()


def _photo_like_jpeg_bytes(size: tuple[int, int], quality: int = 95) -> bytes:
    """
    Генерирует не абсолютно однотонную, а с плавными переходами
    картинку — JPEG сжимает такое похоже на настоящую фотографию,
    а не на предельный случай чистого шума или сплошного цвета.
    """
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    width, _ = size

    for x in range(0, width, 40):
        draw.line(
            [(x, 0), (width - x, size[1])],
            fill=(x % 255, (x * 2) % 255, (x * 3) % 255),
            width=20,
        )

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality)

    return buffer.getvalue()


async def _save(contents: bytes, filename: str = "test.jpg") -> str:
    upload = UploadFile(filename=filename, file=io.BytesIO(contents))
    return await files.save_image(upload, "playgrounds")


@pytest.mark.anyio
async def test_large_photo_is_downscaled_and_compressed():
    original_bytes = _photo_like_jpeg_bytes((4000, 3000))

    url = await _save(original_bytes)

    saved_path = files.UPLOAD_ROOT / url.removeprefix("/uploads/")
    saved_image = Image.open(saved_path)

    assert max(saved_image.size) <= files.MAX_DIMENSION_PX
    # Пропорции должны сохраниться (соотношение сторон не более чем
    # на 1% отличается от исходного — небольшой люфт на округление).
    original_ratio = 4000 / 3000
    saved_ratio = saved_image.size[0] / saved_image.size[1]
    assert abs(original_ratio - saved_ratio) / original_ratio < 0.01

    assert saved_path.stat().st_size < len(original_bytes)


@pytest.mark.anyio
async def test_small_photo_dimensions_are_not_changed():
    original_bytes = _photo_like_jpeg_bytes((400, 300))

    url = await _save(original_bytes)

    saved_image = Image.open(files.UPLOAD_ROOT / url.removeprefix("/uploads/"))

    assert saved_image.size == (400, 300)


@pytest.mark.anyio
async def test_oversized_file_is_rejected_before_processing():
    # Больше MAX_FILE_SIZE_BYTES по факту размера присланных байт —
    # неважно, что внутри, проверка размера должна сработать раньше,
    # чем Pillow вообще попробует это декодировать.
    huge_payload = b"\x00" * (files.MAX_FILE_SIZE_BYTES + 1)

    with pytest.raises(Exception) as exc_info:
        await _save(huge_payload)

    assert exc_info.value.status_code == 400


@pytest.mark.anyio
async def test_non_image_file_is_rejected():
    with pytest.raises(Exception) as exc_info:
        await _save(b"this is definitely not an image", filename="fake.jpg")

    assert exc_info.value.status_code == 400


@pytest.mark.anyio
async def test_saved_filename_does_not_leak_original_name():
    """
    Имя файла на диске должно быть случайным (uuid), а не взятым из
    того, что прислал клиент — иначе можно было бы, например, узнать
    у сервера существование файла с конкретным именем или пытаться
    протащить в путь что-то вроде "../../".
    """
    url = await _save(
        _photo_like_jpeg_bytes((100, 100)), filename="../../etc/passwd.jpg"
    )

    assert "etc" not in url
    assert "passwd" not in url
    assert url.startswith("/uploads/playgrounds/")


@pytest.fixture
def anyio_backend():
    return "asyncio"
