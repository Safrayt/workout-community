from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, SQLModel, func, select

from app.auth import (
    ensure_owner_or_admin,
    get_current_user,
    get_optional_current_user,
)
from app.database import get_session
from app.files import delete_image, save_image
from app.models import User
from app.models_program import (
    ProgramComment,
    ProgramCommentCreate,
    ProgramCommentRead,
    ProgramCreate,
    ProgramDB,
    ProgramDifficulty,
    ProgramFavorite,
    ProgramFavoriteRead,
    ProgramRead,
    ProgramStructure,
    ProgramUpdate,
    ProgramVersionDB,
    ProgramVersionRead,
    ProgramVersionStatus,
    ProgramVersionSummary,
    bump_version_number,
    empty_structure,
)

router = APIRouter(prefix="/programs", tags=["programs"])


# =====================================================================
# Вспомогательные функции
# =====================================================================

def _get_program_or_404(program_id: int, session: Session) -> ProgramDB:
    program = session.get(ProgramDB, program_id)

    if program is None:
        raise HTTPException(status_code=404, detail="Программа не найдена")

    return program


def _ensure_can_view_program(program: ProgramDB, viewer: Optional[User]) -> None:
    """
    Черновик (программа без хотя бы одной опубликованной версии, п.3
    документа) виден только автору и администратору — как и
    непубликованные площадки/мероприятия не появляются в общих
    списках для остальных.
    """
    if program.is_published:
        return

    if viewer is not None and (
        viewer.id == program.author_id or viewer.is_admin
    ):
        return

    raise HTTPException(status_code=404, detail="Программа не найдена")


def _ensure_is_author(program: ProgramDB, current_user: User) -> None:
    ensure_owner_or_admin(
        program.author_id,
        current_user,
        detail="Редактировать эту программу может только её автор",
    )


def _trainings_count(program_id: int, session: Session) -> int:
    """
    Одна запись дневника со ссылкой на программу = одна тренировка по
    программе (п.8 документа) — считается прямым запросом, отдельного
    счётчика/состояния "прохождения" система не хранит (п.7).
    Импорт WorkoutEntry внутри функции — чтобы не заводить цикл
    импортов между models_diary.py и models_program.py на уровне
    модуля (models_diary.py ссылается на programversion по имени
    таблицы, а не импортирует этот файл, но симметрии ради держим
    зависимость только здесь, в роутере).
    """
    from app.models_diary import WorkoutEntry

    return session.exec(
        select(func.count()).where(WorkoutEntry.program_id == program_id)
    ).one()


def _favorites_count(program_id: int, session: Session) -> int:
    return session.exec(
        select(func.count()).where(ProgramFavorite.program_id == program_id)
    ).one()


def _is_favorited(program_id: int, viewer: Optional[User], session: Session) -> bool:
    if viewer is None:
        return False

    return (
        session.exec(
            select(ProgramFavorite).where(
                ProgramFavorite.program_id == program_id,
                ProgramFavorite.user_id == viewer.id,
            )
        ).first()
        is not None
    )


def _to_program_read(
    program: ProgramDB,
    session: Session,
    viewer: Optional[User],
) -> ProgramRead:
    author = session.get(User, program.author_id)

    return ProgramRead(
        **program.model_dump(),
        trainings_count=_trainings_count(program.id, session),
        favorites_count=_favorites_count(program.id, session),
        author_nickname=author.nickname if author else "?",
        author_avatar_url=author.avatar_url if author else None,
        is_favorited_by_viewer=_is_favorited(program.id, viewer, session),
    )


def _get_draft_version(program_id: int, session: Session) -> Optional[ProgramVersionDB]:
    """
    У программы в любой момент времени не больше одной черновой
    версии (см. create_program и publish_draft ниже — новый черновик
    заводится ровно тогда, когда предыдущий публикуется).
    """
    return session.exec(
        select(ProgramVersionDB).where(
            ProgramVersionDB.program_id == program_id,
            ProgramVersionDB.status == ProgramVersionStatus.draft.value,
        )
    ).first()


def _get_version_or_404(version_id: int, session: Session) -> ProgramVersionDB:
    version = session.get(ProgramVersionDB, version_id)

    if version is None:
        raise HTTPException(status_code=404, detail="Версия программы не найдена")

    return version


# =====================================================================
# Каталог программ
# =====================================================================

@router.get("/", response_model=List[ProgramRead])
def list_programs(
    difficulty: Optional[ProgramDifficulty] = None,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> List[ProgramRead]:
    """
    Публичный каталог — только опубликованные программы (п.3: у
    черновика "предназначение" ещё не публиковалось никому, кроме
    автора). Собственные черновики автор видит через GET /programs/mine.
    """
    query = select(ProgramDB).where(ProgramDB.is_published == True)  # noqa: E712

    if difficulty is not None:
        query = query.where(ProgramDB.difficulty == difficulty.value)

    programs = session.exec(query.order_by(ProgramDB.created_at.desc())).all()

    return [_to_program_read(program, session, viewer) for program in programs]


@router.get("/mine", response_model=List[ProgramRead])
def list_my_programs(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[ProgramRead]:
    """Программы текущего пользователя — включая ещё не опубликованные."""
    programs = session.exec(
        select(ProgramDB)
        .where(ProgramDB.author_id == current_user.id)
        .order_by(ProgramDB.created_at.desc())
    ).all()

    return [_to_program_read(program, session, current_user) for program in programs]


@router.get("/{program_id}", response_model=ProgramRead)
def get_program(
    program_id: int,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> ProgramRead:
    program = _get_program_or_404(program_id, session)
    _ensure_can_view_program(program, viewer)

    return _to_program_read(program, session, viewer)


@router.post("/", response_model=ProgramRead)
def create_program(
    data: ProgramCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProgramRead:
    """
    Заводит программу и сразу же её первую черновую версию (п.20:
    "Создание программы → Черновик → Редактирование") — автор
    приступает к наполнению структуры сразу после создания, без
    отдельного шага "создать версию".
    """
    program = ProgramDB(**data.model_dump(), author_id=current_user.id)

    session.add(program)
    session.commit()
    session.refresh(program)

    draft = ProgramVersionDB(program_id=program.id, structure=empty_structure())
    session.add(draft)
    session.commit()

    return _to_program_read(program, session, current_user)


@router.put("/{program_id}", response_model=ProgramRead)
def update_program(
    program_id: int,
    data: ProgramUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProgramRead:
    program = _get_program_or_404(program_id, session)
    _ensure_is_author(program, current_user)

    updates = data.model_dump(exclude_unset=True)

    for field_name, value in updates.items():
        setattr(program, field_name, value)

    program.updated_at = datetime.now(timezone.utc)

    session.add(program)
    session.commit()
    session.refresh(program)

    return _to_program_read(program, session, current_user)


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(
    program_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """
    Удалить можно только программу, которая ни разу не публиковалась —
    у опубликованной программы уже могут быть записи в чужих дневниках,
    ссылающиеся на неё и её версии (п.6 документа: старые записи должны
    сохранять историческую достоверность), удалять такую историю из-под
    пользователей нельзя. Для опубликованной программы автору доступно
    только редактирование информации и создание новых версий.
    """
    program = _get_program_or_404(program_id, session)
    _ensure_is_author(program, current_user)

    if program.is_published:
        raise HTTPException(
            status_code=400,
            detail=(
                "Нельзя удалить программу, у которой есть опубликованные "
                "версии — на неё уже могут ссылаться записи в дневниках."
            ),
        )

    draft = _get_draft_version(program_id, session)
    if draft is not None:
        session.delete(draft)

    for comment in session.exec(
        select(ProgramComment).where(ProgramComment.program_id == program_id)
    ).all():
        session.delete(comment)

    for favorite in session.exec(
        select(ProgramFavorite).where(ProgramFavorite.program_id == program_id)
    ).all():
        session.delete(favorite)

    session.delete(program)
    session.commit()


# --- Обложка программы (п.2 документа) -------------------------------------

@router.post("/{program_id}/cover", response_model=ProgramRead)
async def upload_program_cover(
    program_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProgramRead:
    """
    Как афиша мероприятия (upload_event_poster в routers/events.py):
    если обложка уже была, старый файл удаляется с диска, чтобы не
    копились неиспользуемые файлы.
    """
    program = _get_program_or_404(program_id, session)
    _ensure_is_author(program, current_user)

    delete_image(program.cover_url)
    program.cover_url = await save_image(file, "programs")
    program.updated_at = datetime.now(timezone.utc)

    session.add(program)
    session.commit()
    session.refresh(program)

    return _to_program_read(program, session, current_user)


@router.delete("/{program_id}/cover", response_model=ProgramRead)
def delete_program_cover(
    program_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProgramRead:
    program = _get_program_or_404(program_id, session)
    _ensure_is_author(program, current_user)

    delete_image(program.cover_url)
    program.cover_url = None
    program.updated_at = datetime.now(timezone.utc)

    session.add(program)
    session.commit()
    session.refresh(program)

    return _to_program_read(program, session, current_user)


# =====================================================================
# Версии программы
# =====================================================================

@router.get("/{program_id}/versions", response_model=List[ProgramVersionSummary])
def list_program_versions(
    program_id: int,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> List[ProgramVersionDB]:
    """
    Только опубликованные версии (п.4.1 "Исторические версии доступны
    для просмотра") — черновик не является версией, которую можно
    просматривать как историю, он отдаётся отдельным эндпоинтом ниже.
    """
    program = _get_program_or_404(program_id, session)
    _ensure_can_view_program(program, viewer)

    versions = session.exec(
        select(ProgramVersionDB)
        .where(
            ProgramVersionDB.program_id == program_id,
            ProgramVersionDB.status == ProgramVersionStatus.published.value,
        )
        .order_by(ProgramVersionDB.published_at)
    ).all()

    return list(versions)


@router.get("/{program_id}/versions/{version_id}", response_model=ProgramVersionRead)
def get_program_version(
    program_id: int,
    version_id: int,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> ProgramVersionDB:
    """
    Показывает конкретную версию целиком, со структурой — нужна и для
    просмотра истории, и для того, чтобы в старой записи дневника можно
    было открыть именно ту версию программы, по которой тренировался
    пользователь (п.6: "Сила на турниках — версия 1.1").
    """
    program = _get_program_or_404(program_id, session)
    _ensure_can_view_program(program, viewer)

    version = _get_version_or_404(version_id, session)

    if version.program_id != program_id:
        raise HTTPException(status_code=404, detail="Версия программы не найдена")

    if version.status == ProgramVersionStatus.draft.value:
        if viewer is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Просматривать черновик может только автор программы",
            )
        _ensure_is_author(program, viewer)

    return version


@router.get("/{program_id}/draft", response_model=ProgramVersionRead)
def get_program_draft(
    program_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProgramVersionDB:
    program = _get_program_or_404(program_id, session)
    _ensure_is_author(program, current_user)

    draft = _get_draft_version(program_id, session)

    if draft is None:
        # Не должно случаться в обычном потоке (create_program всегда
        # заводит черновик, а publish_draft — тут же новый следующий),
        # но на всякий случай отвечаем понятной ошибкой, а не 500.
        raise HTTPException(
            status_code=404,
            detail="У программы сейчас нет редактируемого черновика",
        )

    return draft


@router.put("/{program_id}/draft", response_model=ProgramVersionRead)
def update_program_draft(
    program_id: int,
    data: ProgramStructure,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProgramVersionDB:
    """
    Полностью заменяет содержимое черновика — редактор структуры на
    фронтенде хранит дерево целиком и отправляет его сюда при
    сохранении, частичных патчей вложенной структуры не предусмотрено
    (п.1: сама структура — целиком авторская, дробить её обновление на
    уровне API смысла не имеет).
    """
    program = _get_program_or_404(program_id, session)
    _ensure_is_author(program, current_user)

    draft = _get_draft_version(program_id, session)

    if draft is None:
        raise HTTPException(
            status_code=404,
            detail="У программы сейчас нет редактируемого черновика",
        )

    draft.structure = data.model_dump(mode="json")
    draft.updated_at = datetime.now(timezone.utc)

    session.add(draft)
    session.commit()
    session.refresh(draft)

    return draft


class ProgramPublishRequest(SQLModel):
    changelog: Optional[str] = None
    major: bool = False


@router.post("/{program_id}/publish", response_model=ProgramVersionRead)
def publish_draft(
    program_id: int,
    data: ProgramPublishRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProgramVersionDB:
    """
    Публикует текущий черновик (п.3: "создаётся новая редактируемая
    версия → автор вносит изменения → добавляет комментарий → публикует
    новую версию") и сразу заводит следующий черновик — его исходное
    содержимое клонируется из только что опубликованной версии, чтобы
    автор продолжал редактирование от актуального состояния, а не с
    чистого листа.
    """
    program = _get_program_or_404(program_id, session)
    _ensure_is_author(program, current_user)

    draft = _get_draft_version(program_id, session)

    if draft is None:
        raise HTTPException(
            status_code=404,
            detail="У программы сейчас нет редактируемого черновика",
        )

    is_first_publish = not program.is_published

    if not is_first_publish and not (data.changelog and data.changelog.strip()):
        raise HTTPException(
            status_code=400,
            detail=(
                "Опишите, что изменилось в новой версии — это обязательно "
                "для всех публикаций, кроме самой первой (п.4 документа)."
            ),
        )

    now = datetime.now(timezone.utc)

    previous_number = None
    if program.current_version_id is not None:
        previous_version = session.get(ProgramVersionDB, program.current_version_id)
        previous_number = previous_version.version_number if previous_version else None

    draft.status = ProgramVersionStatus.published.value
    draft.version_number = bump_version_number(previous_number, major=data.major)
    draft.changelog = data.changelog.strip() if data.changelog else None
    draft.published_at = now
    draft.updated_at = now

    session.add(draft)
    session.commit()
    session.refresh(draft)

    program.is_published = True
    program.current_version_id = draft.id
    program.updated_at = now
    session.add(program)

    next_draft = ProgramVersionDB(
        program_id=program.id,
        # Клон структуры только что опубликованной версии — новый
        # черновик продолжает с того же места, а не с пустой структуры.
        structure=draft.structure,
    )
    session.add(next_draft)

    session.commit()

    return draft


# =====================================================================
# Избранное (п.9 документа)
# =====================================================================

@router.post("/{program_id}/favorite", response_model=ProgramFavoriteRead)
def add_program_favorite(
    program_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProgramFavorite:
    program = _get_program_or_404(program_id, session)
    _ensure_can_view_program(program, current_user)

    existing = session.exec(
        select(ProgramFavorite).where(
            ProgramFavorite.program_id == program_id,
            ProgramFavorite.user_id == current_user.id,
        )
    ).first()

    if existing is not None:
        return existing

    favorite = ProgramFavorite(program_id=program_id, user_id=current_user.id)
    session.add(favorite)
    session.commit()
    session.refresh(favorite)

    return favorite


@router.delete("/{program_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def remove_program_favorite(
    program_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    favorite = session.exec(
        select(ProgramFavorite).where(
            ProgramFavorite.program_id == program_id,
            ProgramFavorite.user_id == current_user.id,
        )
    ).first()

    if favorite is None:
        return

    session.delete(favorite)
    session.commit()


@router.get("/favorites/mine", response_model=List[ProgramRead])
def list_my_favorite_programs(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[ProgramRead]:
    """
    Назначение избранного — быстро найти программу заново (п.9), в том
    числе при выборе программы в форме записи дневника.
    """
    favorites = session.exec(
        select(ProgramFavorite).where(ProgramFavorite.user_id == current_user.id)
    ).all()

    programs = [
        session.get(ProgramDB, favorite.program_id) for favorite in favorites
    ]

    return [
        _to_program_read(program, session, current_user)
        for program in programs
        if program is not None
    ]


# =====================================================================
# Комментарии (п.19 документа)
# =====================================================================

COMMENT_MAX_LENGTH = 500


def _validate_comment_text(text: str) -> str:
    trimmed = text.strip()

    if len(trimmed) == 0:
        raise HTTPException(status_code=400, detail="Напишите текст комментария.")

    if len(trimmed) > COMMENT_MAX_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Комментарий не должен превышать {COMMENT_MAX_LENGTH} символов.",
        )

    return trimmed


@router.get("/{program_id}/comments", response_model=List[ProgramCommentRead])
def list_program_comments(
    program_id: int,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> List[ProgramComment]:
    program = _get_program_or_404(program_id, session)
    _ensure_can_view_program(program, viewer)

    comments = session.exec(
        select(ProgramComment)
        .where(ProgramComment.program_id == program_id)
        .order_by(ProgramComment.created_at)
    ).all()

    return list(comments)


@router.post("/{program_id}/comments", response_model=ProgramCommentRead)
def create_program_comment(
    program_id: int,
    data: ProgramCommentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProgramComment:
    program = _get_program_or_404(program_id, session)
    _ensure_can_view_program(program, current_user)

    comment = ProgramComment(
        program_id=program_id,
        user_id=current_user.id,
        text=_validate_comment_text(data.text),
    )

    session.add(comment)
    session.commit()
    session.refresh(comment)

    return comment


def _get_program_comment_or_404(comment_id: int, session: Session) -> ProgramComment:
    comment = session.get(ProgramComment, comment_id)

    if comment is None:
        raise HTTPException(status_code=404, detail="Комментарий не найден")

    return comment


@router.put("/comments/{comment_id}", response_model=ProgramCommentRead)
def update_program_comment(
    comment_id: int,
    data: ProgramCommentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProgramComment:
    comment = _get_program_comment_or_404(comment_id, session)

    # Строго только автор, даже для админа — как и у комментариев
    # комплексов (см. update_complex_comment в routers/complexes.py).
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Изменять этот комментарий может только его автор",
        )

    comment.text = _validate_comment_text(data.text)

    session.add(comment)
    session.commit()
    session.refresh(comment)

    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    comment = _get_program_comment_or_404(comment_id, session)

    ensure_owner_or_admin(
        comment.user_id,
        current_user,
        detail="Удалять этот комментарий может только его автор",
    )

    session.delete(comment)
    session.commit()


# =====================================================================
# Используется routers/diary.py при создании/изменении записи тренировки
# =====================================================================

def resolve_program_link(
    program_id: int,
    session: Session,
) -> ProgramVersionDB:
    """
    Проверяет, что на программу можно сослаться из дневника (п.7 MVP:
    "выбор версии автоматически"), и возвращает её текущую
    опубликованную версию — именно её id фиксируется в записи дневника
    (WorkoutEntry.program_version_id).

    Сослаться можно только на опубликованную программу: у черновика
    ещё нет версии, которую можно было бы "зафиксировать" как то, по
    чему тренировался пользователь.
    """
    program = session.get(ProgramDB, program_id)

    if program is None:
        raise HTTPException(status_code=404, detail="Программа не найдена")

    if not program.is_published or program.current_version_id is None:
        raise HTTPException(
            status_code=400,
            detail="Указать можно только опубликованную программу",
        )

    return session.get(ProgramVersionDB, program.current_version_id)
