import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile

# Папка для загруженных файлов — рядом с кодом приложения.
# В .gitignore она исключена: сами файлы в git не попадают,
# только код, который их создаёт.
UPLOAD_ROOT = Path("uploads")

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 МБ


def ensure_upload_dirs() -> None:
    """Создаёт подпапки для загрузок, если их ещё нет."""
    for subfolder in ("playgrounds", "events"):
        (UPLOAD_ROOT / subfolder).mkdir(parents=True, exist_ok=True)


async def save_image(upload_file: UploadFile, subfolder: str) -> str:
    """
    Проверяет и сохраняет загруженное изображение на диск.
    Возвращает URL, по которому файл будет доступен из браузера
    (папка uploads примонтирована в main.py как статика).
    """
    if upload_file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Допустимы только изображения (jpeg, png, webp)",
        )

    contents = await upload_file.read()

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Файл слишком большой (максимум 5 МБ)",
        )

    # Генерируем случайное имя файла, чтобы:
    # 1) не было конфликтов, если два человека загрузят "photo.jpg";
    # 2) нельзя было угадать/перебрать чужие файлы по имени.
    extension = Path(upload_file.filename or "").suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{extension}"
    destination = UPLOAD_ROOT / subfolder / filename

    with open(destination, "wb") as f:
        f.write(contents)

    return f"/uploads/{subfolder}/{filename}"


def delete_image(url: Optional[str]) -> None:
    """Удаляет файл с диска по URL, который ранее вернул save_image."""
    if not url or not url.startswith("/uploads/"):
        return

    relative_path = url.removeprefix("/uploads/")
    file_path = UPLOAD_ROOT / relative_path

    if file_path.exists():
        file_path.unlink()
