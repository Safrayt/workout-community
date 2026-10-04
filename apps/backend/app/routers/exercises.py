from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.auth import ensure_admin, get_current_user
from app.database import get_session
from app.files import delete_upload, save_image, save_video
from app.models import User
from app.models_exercise import (
    ExerciseDB,
    ExerciseRead,
    ExerciseWrite,
    apply_exercise_write,
    exercise_from_db,
    make_unique_slug,
)

router = APIRouter(prefix="/exercises", tags=["exercises"])

# Подпапка в uploads/ для фото и видео упражнений (см. app/files.py).
MEDIA_SUBFOLDER = "exercises"


# =====================================================================
# База упражнений (таблица ExerciseDB, см. models_exercise.py). Читать
# может кто угодно (как каталог комплексов), добавлять, править и
# удалять — только администратор (см. ensure_admin в app/auth.py).
# =====================================================================


def _get_exercise_db_or_404(exercise_id: str, session: Session) -> ExerciseDB:
    row = session.get(ExerciseDB, exercise_id)

    if row is None:
        raise HTTPException(status_code=404, detail="Упражнение не найдено")

    return row


@router.get("/", response_model=List[ExerciseRead])
def list_exercises(session: Session = Depends(get_session)) -> List[ExerciseRead]:
    """Все упражнения в порядке показа — одинаково для всех пользователей."""
    rows = session.exec(
        select(ExerciseDB).order_by(ExerciseDB.position, ExerciseDB.id)
    ).all()

    return [exercise_from_db(row) for row in rows]


@router.get("/{exercise_id}", response_model=ExerciseRead)
def get_exercise(
    exercise_id: str, session: Session = Depends(get_session)
) -> ExerciseRead:
    return exercise_from_db(_get_exercise_db_or_404(exercise_id, session))


@router.post(
    "/", response_model=ExerciseRead, status_code=status.HTTP_201_CREATED
)
def create_exercise(
    data: ExerciseWrite,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ExerciseRead:
    ensure_admin(current_user, "Добавлять упражнения может только администратор")

    last_position = session.exec(
        select(ExerciseDB.position).order_by(ExerciseDB.position.desc())
    ).first()

    row = ExerciseDB(
        id=make_unique_slug(session, data.name, data.name_en),
        position=(last_position + 1) if last_position is not None else 0,
        name="",
        movement_type=data.movement_type,
    )
    apply_exercise_write(row, data)

    session.add(row)

    try:
        session.commit()
    except IntegrityError:
        # Два администратора одновременно добавили упражнение с одним и
        # тем же названием — редкий случай, достаточно повторить.
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail="Не удалось сохранить упражнение, попробуйте ещё раз",
        )

    session.refresh(row)

    return exercise_from_db(row)


@router.put("/{exercise_id}", response_model=ExerciseRead)
def update_exercise(
    exercise_id: str,
    data: ExerciseWrite,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ExerciseRead:
    ensure_admin(
        current_user, "Редактировать упражнения может только администратор"
    )

    row = _get_exercise_db_or_404(exercise_id, session)

    apply_exercise_write(row, data)

    session.add(row)
    session.commit()
    session.refresh(row)

    return exercise_from_db(row)


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    exercise_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    ensure_admin(current_user, "Удалять упражнения может только администратор")

    row = _get_exercise_db_or_404(exercise_id, session)

    photo_url, video_url = row.photo_url, row.video_url

    session.delete(row)
    session.commit()

    # Файлы удаляем уже после того, как запись успешно удалена: если бы
    # коммит упал, упражнение осталось бы со ссылками на несуществующие
    # файлы. Стартовые фото/видео (статика фронтенда, /exercises/...)
    # delete_upload не трогает — он работает только с /uploads/.
    delete_upload(photo_url)
    delete_upload(video_url)


# =====================================================================
# Фото и видео. Загружаются отдельными запросами уже после того, как
# упражнение создано: так не остаётся "осиротевших" файлов от
# незавершённой формы, а замена файла сразу удаляет предыдущий.
# =====================================================================


def _save_media_url(
    row: ExerciseDB,
    field: str,
    new_url: str | None,
    session: Session,
) -> ExerciseRead:
    old_url = getattr(row, field)

    setattr(row, field, new_url)
    row.updated_at = datetime.now(timezone.utc)

    session.add(row)
    session.commit()
    session.refresh(row)

    # Старый файл удаляем после успешного коммита — по той же причине,
    # что и в delete_exercise.
    if old_url != new_url:
        delete_upload(old_url)

    return exercise_from_db(row)


@router.put("/{exercise_id}/photo", response_model=ExerciseRead)
async def upload_exercise_photo(
    exercise_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ExerciseRead:
    ensure_admin(
        current_user, "Загружать фото упражнений может только администратор"
    )

    row = _get_exercise_db_or_404(exercise_id, session)
    url = await save_image(file, MEDIA_SUBFOLDER)

    return _save_media_url(row, "photo_url", url, session)


@router.delete("/{exercise_id}/photo", response_model=ExerciseRead)
def delete_exercise_photo(
    exercise_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ExerciseRead:
    ensure_admin(
        current_user, "Удалять фото упражнений может только администратор"
    )

    row = _get_exercise_db_or_404(exercise_id, session)

    return _save_media_url(row, "photo_url", None, session)


@router.put("/{exercise_id}/video", response_model=ExerciseRead)
async def upload_exercise_video(
    exercise_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ExerciseRead:
    ensure_admin(
        current_user, "Загружать видео упражнений может только администратор"
    )

    row = _get_exercise_db_or_404(exercise_id, session)
    url = await save_video(file, MEDIA_SUBFOLDER)

    return _save_media_url(row, "video_url", url, session)


@router.delete("/{exercise_id}/video", response_model=ExerciseRead)
def delete_exercise_video(
    exercise_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ExerciseRead:
    ensure_admin(
        current_user, "Удалять видео упражнений может только администратор"
    )

    row = _get_exercise_db_or_404(exercise_id, session)

    return _save_media_url(row, "video_url", None, session)
