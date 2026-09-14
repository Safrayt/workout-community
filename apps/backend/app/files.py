import io
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

# Папка для загруженных файлов — рядом с кодом приложения.
# В .gitignore она исключена: сами файлы в git не попадают,
# только код, который их создаёт.
UPLOAD_ROOT = Path("uploads")

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 МБ

# Длинная сторона, до которой уменьшается любое загруженное фото.
# 1920px с запасом хватает даже на полноэкранный показ на обычных
# мониторах, а весит в разы меньше, чем фото 12+ Мп прямо с камеры
# телефона (типичный современный телефон снимает 3000-4000px по
# длинной стороне) — то есть основная часть экономии места на диске
# и трафика происходит именно здесь, а не от пересжатия самого по себе.
MAX_DIMENSION_PX = 1920

# Качество для форматов с потерями (0-100). 85 — стандартный
# компромисс: разница с оригиналом на глаз практически не видна,
# а вес файла обычно падает в 3-5 раз по сравнению с quality=95+,
# которое часто стоит по умолчанию в камерах телефонов.
LOSSY_QUALITY = 85

# Единственный источник правды о том, какие форматы разрешены и в
# какое расширение каждый из них сохраняется на диске. Расширение
# файла ВСЕГДА берётся отсюда — по формату, который реально
# распознал Pillow внутри байтов файла, а не из имени файла или
# заголовка Content-Type, присланных клиентом. И то, и другое можно
# подделать: например, прислать HTML или SVG со скриптом с
# заголовком "Content-Type: image/jpeg" и именем "photo.jpg" —
# если бы мы доверяли этим полям, файл сохранился бы и отдавался
# по прямой ссылке из /uploads/, а браузер показал бы его как
# HTML/SVG, а не как картинку (классическая XSS через загрузку
# файлов). Поэтому здесь файл на самом деле декодируется как
# изображение, и уже это решает, что это за формат.
ALLOWED_IMAGE_FORMATS = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
}


def ensure_upload_dirs() -> None:
    """Создаёт подпапки для загрузок, если их ещё нет."""
    for subfolder in (
        "playgrounds", "events", "workout_entries", "diary_notes",
    ):
        (UPLOAD_ROOT / subfolder).mkdir(parents=True, exist_ok=True)


def _decode_and_validate_image(contents: bytes) -> Image.Image:
    """
    Действительно открывает файл как изображение и проверяет, что это
    один из разрешённых форматов. Бросает HTTPException(400), если
    файл повреждён, не является изображением или его формат не из
    списка ALLOWED_IMAGE_FORMATS.
    """
    try:
        image = Image.open(io.BytesIO(contents))
        image.load()
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Файл повреждён или не является изображением",
        )

    if image.format not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(
            status_code=400,
            detail="Допустимы только изображения (jpeg, png, webp)",
        )

    return image


async def save_image(upload_file: UploadFile, subfolder: str) -> str:
    """
    Проверяет и сохраняет загруженное изображение на диск.
    Возвращает URL, по которому файл будет доступен из браузера
    (папка uploads примонтирована в main.py как статика).
    """
    contents = await upload_file.read()

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Файл слишком большой (максимум 5 МБ)",
        )

    image = _decode_and_validate_image(contents)
    extension = ALLOWED_IMAGE_FORMATS[image.format]

    # Генерируем случайное имя файла, чтобы:
    # 1) не было конфликтов, если два человека загрузят "photo.jpg";
    # 2) нельзя было угадать/перебрать чужие файлы по имени.
    filename = f"{uuid.uuid4().hex}{extension}"
    destination = UPLOAD_ROOT / subfolder / filename

    # Пересохраняем через Pillow заново декодированными пикселями, а
    # не пишем исходные байты как есть. Это даёт две вещи бесплатно:
    # - обрезает любые данные "после конца" настоящего изображения
    #   (файлы-полиглоты, которые одновременно валидны как картинка
    #   и как что-то ещё);
    # - стирает EXIF-метаданные, включая GPS-координаты места съёмки,
    #   которые телефоны часто пишут в фото — иначе пользователь мог
    #   бы случайно опубликовать координаты дома вместе с фото
    #   тренировки.
    if image.format == "JPEG" and image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    elif image.format == "PNG" and image.mode == "P":
        image = image.convert("RGBA")

    # thumbnail() уменьшает только те изображения, что больше
    # MAX_DIMENSION_PX по длинной стороне, сохраняя пропорции —
    # маленькие картинки (например, уже оптимизированные заранее)
    # он не тронет и уж точно не увеличит.
    image.thumbnail((MAX_DIMENSION_PX, MAX_DIMENSION_PX), Image.LANCZOS)

    save_kwargs: dict = {"format": image.format}

    if image.format in ("JPEG", "WEBP"):
        save_kwargs["quality"] = LOSSY_QUALITY
        save_kwargs["optimize"] = True
    elif image.format == "PNG":
        # PNG без потерь — quality тут ни при чём, но optimize всё
        # равно даёт чуть более плотное сжатие ценой времени на
        # сохранение (для отдельной картинки — доли секунды).
        save_kwargs["optimize"] = True

    image.save(destination, **save_kwargs)

    return f"/uploads/{subfolder}/{filename}"


def delete_image(url: Optional[str]) -> None:
    """Удаляет файл с диска по URL, который ранее вернул save_image."""
    if not url or not url.startswith("/uploads/"):
        return

    relative_path = url.removeprefix("/uploads/")
    file_path = UPLOAD_ROOT / relative_path

    if file_path.exists():
        file_path.unlink()
