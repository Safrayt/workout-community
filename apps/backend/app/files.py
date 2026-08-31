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

    image.save(destination, format=image.format)

    return f"/uploads/{subfolder}/{filename}"


def delete_image(url: Optional[str]) -> None:
    """Удаляет файл с диска по URL, который ранее вернул save_image."""
    if not url or not url.startswith("/uploads/"):
        return

    relative_path = url.removeprefix("/uploads/")
    file_path = UPLOAD_ROOT / relative_path

    if file_path.exists():
        file_path.unlink()
