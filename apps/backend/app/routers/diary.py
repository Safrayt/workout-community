import re
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.auth import get_current_user, get_optional_current_user
from app.database import get_session
from app.files import delete_image, save_image
from app.models import User
from app.models_diary import (
    Comment,
    CommentCreate,
    CommentRead,
    DiaryNote,
    DiaryNoteCreate,
    DiaryNotePhoto,
    DiaryNotePhotoRead,
    DiaryNoteRead,
    DiaryNoteUpdate,
    DiaryRecordType,
    PersonalTag,
    PersonalTagCreate,
    PersonalTagRead,
    PersonalTagUpdate,
    WorkoutEntry,
    WorkoutEntryCreate,
    WorkoutEntryPhoto,
    WorkoutEntryPhotoRead,
    WorkoutEntryRead,
    WorkoutEntryUpdate,
)

router = APIRouter(prefix="/diary", tags=["diary"])

# Значения продублированы с фронтенда (см. utils/workoutTags.ts,
# constants/personalTags.ts, constants/workoutEntryPhotos.ts,
# constants/diaryNotes.ts, validation/comment.ts) — единого источника
# правды на два разных языка нет, так что при изменении лимита на
# фронте не забыть поправить и здесь.
MAX_TAGS_PER_ENTRY = 10
MAX_PERSONAL_TAGS = 50
MAX_TAG_NAME_LENGTH = 30
MAX_WORKOUT_ENTRY_PHOTOS = 5
MAX_NOTE_TITLE_LENGTH = 100
COMMENT_MAX_LENGTH = 500


# --- Общие вспомогательные функции ------------------------------------

def _normalize_tag_name(name: str) -> str:
    """Совпадает с normalizeTagName на фронтенде: обрезаем края,
    схлопываем внутренние пробелы."""
    return re.sub(r"\s+", " ", name.strip())


def _check_diary_visible(owner: User, viewer: Optional[User]) -> None:
    """
    Дневник виден всем, если только владелец не скрыл его в настройках
    приватности — тогда доступ есть только самому владельцу.
    """
    if owner.diary_visible:
        return

    if viewer is not None and viewer.id == owner.id:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Дневник этого пользователя скрыт настройками приватности",
    )


def _get_target_user_or_404(user_id: int, session: Session) -> User:
    user = session.get(User, user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    return user


def _sync_personal_tags(
    user_id: int, tag_names: List[str], session: Session
) -> None:
    """
    Регистрирует новые теги записи как личные теги пользователя, если
    их ещё нет в каталоге — как registerUsedTags в
    PersonalTagsContext.tsx: тег, введённый прямо в форме записи, всё
    равно должен появиться в общем списке "Мои теги".
    """
    if not tag_names:
        return

    existing = session.exec(
        select(PersonalTag).where(PersonalTag.user_id == user_id)
    ).all()
    existing_keys = {tag.name.lower() for tag in existing}

    for name in tag_names:
        key = name.lower()

        if key in existing_keys:
            continue

        existing_keys.add(key)
        session.add(PersonalTag(user_id=user_id, name=name))


def _validate_tags(tags: List[str]) -> None:
    if len(tags) > MAX_TAGS_PER_ENTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Можно добавить не более {MAX_TAGS_PER_ENTRY} тегов.",
        )


# =====================================================================
# Записи тренировок
# =====================================================================

@router.post("/entries", response_model=WorkoutEntryRead)
def create_workout_entry(
    data: WorkoutEntryCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> WorkoutEntry:
    _validate_tags(data.tags)

    entry = WorkoutEntry(**data.model_dump(), user_id=current_user.id)

    session.add(entry)
    _sync_personal_tags(current_user.id, data.tags, session)
    session.commit()
    session.refresh(entry)

    return entry


def _visible_diary_user_ids(
    session: Session, viewer: Optional[User]
) -> set[int]:
    """
    Все пользователи, чей дневник виден в общей ленте (Home.tsx):
    у кого diary_visible=True, плюс сам смотрящий — свои записи он
    должен видеть в ленте, даже если сам их от других скрыл.
    """
    return {
        user.id
        for user in session.exec(select(User)).all()
        if user.diary_visible or (viewer is not None and viewer.id == user.id)
    }


@router.get("/entries", response_model=List[WorkoutEntryRead])
def list_workout_entries(
    user_id: Optional[int] = None,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> List[WorkoutEntry]:
    """
    Без user_id — общая лента (Home.tsx/HomeFeed): записи всех, чей
    дневник не скрыт настройками приватности, плюс собственные записи
    смотрящего в любом случае. С user_id — дневник одного конкретного
    пользователя (/u/:username/diary), с обычной проверкой
    diary_visible через _check_diary_visible.
    """
    if user_id is not None:
        owner = _get_target_user_or_404(user_id, session)
        _check_diary_visible(owner, viewer)

        entries = session.exec(
            select(WorkoutEntry).where(WorkoutEntry.user_id == user_id)
        ).all()

        return list(entries)

    visible_user_ids = _visible_diary_user_ids(session, viewer)
    all_entries = session.exec(select(WorkoutEntry)).all()

    return [e for e in all_entries if e.user_id in visible_user_ids]


def _get_workout_entry_or_404(
    entry_id: int, session: Session
) -> WorkoutEntry:
    entry = session.get(WorkoutEntry, entry_id)

    if entry is None:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    return entry


@router.get("/entries/{entry_id}", response_model=WorkoutEntryRead)
def get_workout_entry(
    entry_id: int,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> WorkoutEntry:
    entry = _get_workout_entry_or_404(entry_id, session)
    owner = _get_target_user_or_404(entry.user_id, session)
    _check_diary_visible(owner, viewer)

    return entry


def _ensure_entry_owner(entry: WorkoutEntry, current_user: User) -> None:
    if entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Изменять эту запись может только её автор",
        )


@router.put("/entries/{entry_id}", response_model=WorkoutEntryRead)
def update_workout_entry(
    entry_id: int,
    data: WorkoutEntryUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> WorkoutEntry:
    entry = _get_workout_entry_or_404(entry_id, session)
    _ensure_entry_owner(entry, current_user)

    updates = data.model_dump(exclude_unset=True)

    if "tags" in updates:
        _validate_tags(updates["tags"])
        _sync_personal_tags(current_user.id, updates["tags"], session)

    for field_name, value in updates.items():
        setattr(entry, field_name, value)

    session.add(entry)
    session.commit()
    session.refresh(entry)

    return entry


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    entry = _get_workout_entry_or_404(entry_id, session)
    _ensure_entry_owner(entry, current_user)

    for photo in entry.photos:
        delete_image(photo.url)
        session.delete(photo)

    _delete_comments_for_record(entry_id, DiaryRecordType.workout, session)

    session.delete(entry)
    session.commit()


@router.post(
    "/entries/{entry_id}/photos",
    response_model=WorkoutEntryPhotoRead,
)
async def add_workout_entry_photo(
    entry_id: int,
    file: UploadFile = File(...),
    is_main: bool = Form(False),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> WorkoutEntryPhoto:
    entry = _get_workout_entry_or_404(entry_id, session)
    _ensure_entry_owner(entry, current_user)

    if len(entry.photos) >= MAX_WORKOUT_ENTRY_PHOTOS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Можно загрузить не более "
                f"{MAX_WORKOUT_ENTRY_PHOTOS} фотографий."
            ),
        )

    url = await save_image(file, "workout_entries")

    if is_main:
        for existing_photo in entry.photos:
            if existing_photo.is_main:
                existing_photo.is_main = False
                session.add(existing_photo)

    photo = WorkoutEntryPhoto(entry_id=entry_id, url=url, is_main=is_main)

    session.add(photo)
    session.commit()
    session.refresh(photo)

    return photo


@router.delete(
    "/entries/{entry_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_workout_entry_photo(
    entry_id: int,
    photo_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    entry = _get_workout_entry_or_404(entry_id, session)
    _ensure_entry_owner(entry, current_user)

    photo = session.get(WorkoutEntryPhoto, photo_id)

    if photo is None or photo.entry_id != entry_id:
        raise HTTPException(status_code=404, detail="Фото не найдено")

    delete_image(photo.url)
    session.delete(photo)
    session.commit()


@router.put(
    "/entries/{entry_id}/photos/{photo_id}/set-main",
    response_model=WorkoutEntryPhotoRead,
)
def set_main_workout_entry_photo(
    entry_id: int,
    photo_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> WorkoutEntryPhoto:
    """Делает фото главным (сняв отметку с остальных) — тот же
    паттерн, что и set_main_playground_photo в routers/playgrounds.py."""
    entry = _get_workout_entry_or_404(entry_id, session)
    _ensure_entry_owner(entry, current_user)

    target_photo = session.get(WorkoutEntryPhoto, photo_id)

    if target_photo is None or target_photo.entry_id != entry_id:
        raise HTTPException(status_code=404, detail="Фото не найдено")

    for photo in entry.photos:
        if photo.is_main and photo.id != photo_id:
            photo.is_main = False
            session.add(photo)

    target_photo.is_main = True
    session.add(target_photo)

    session.commit()
    session.refresh(target_photo)

    return target_photo


# =====================================================================
# Заметки дневника
# =====================================================================

@router.post("/notes", response_model=DiaryNoteRead)
def create_diary_note(
    data: DiaryNoteCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DiaryNote:
    _validate_tags(data.tags)

    note = DiaryNote(**data.model_dump(), user_id=current_user.id)

    session.add(note)
    _sync_personal_tags(current_user.id, data.tags, session)
    session.commit()
    session.refresh(note)

    return note


@router.get("/notes", response_model=List[DiaryNoteRead])
def list_diary_notes(
    user_id: Optional[int] = None,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> List[DiaryNote]:
    """Без user_id — общая лента, с ним — дневник одного пользователя.
    См. подробный комментарий у list_workout_entries — та же логика."""
    if user_id is not None:
        owner = _get_target_user_or_404(user_id, session)
        _check_diary_visible(owner, viewer)

        notes = session.exec(
            select(DiaryNote).where(DiaryNote.user_id == user_id)
        ).all()

        return list(notes)

    visible_user_ids = _visible_diary_user_ids(session, viewer)
    all_notes = session.exec(select(DiaryNote)).all()

    return [n for n in all_notes if n.user_id in visible_user_ids]


def _get_diary_note_or_404(note_id: int, session: Session) -> DiaryNote:
    note = session.get(DiaryNote, note_id)

    if note is None:
        raise HTTPException(status_code=404, detail="Заметка не найдена")

    return note


@router.get("/notes/{note_id}", response_model=DiaryNoteRead)
def get_diary_note(
    note_id: int,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> DiaryNote:
    note = _get_diary_note_or_404(note_id, session)
    owner = _get_target_user_or_404(note.user_id, session)
    _check_diary_visible(owner, viewer)

    return note


def _ensure_note_owner(note: DiaryNote, current_user: User) -> None:
    if note.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Изменять эту заметку может только её автор",
        )


@router.put("/notes/{note_id}", response_model=DiaryNoteRead)
def update_diary_note(
    note_id: int,
    data: DiaryNoteUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DiaryNote:
    note = _get_diary_note_or_404(note_id, session)
    _ensure_note_owner(note, current_user)

    updates = data.model_dump(exclude_unset=True)

    if updates.get("title") is not None and (
        len(updates["title"]) > MAX_NOTE_TITLE_LENGTH
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Заголовок не должен превышать "
                f"{MAX_NOTE_TITLE_LENGTH} символов."
            ),
        )

    if "tags" in updates:
        _validate_tags(updates["tags"])
        _sync_personal_tags(current_user.id, updates["tags"], session)

    for field_name, value in updates.items():
        setattr(note, field_name, value)

    session.add(note)
    session.commit()
    session.refresh(note)

    return note


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diary_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    note = _get_diary_note_or_404(note_id, session)
    _ensure_note_owner(note, current_user)

    for photo in note.photos:
        delete_image(photo.url)
        session.delete(photo)

    _delete_comments_for_record(note_id, DiaryRecordType.note, session)

    session.delete(note)
    session.commit()


@router.post("/notes/{note_id}/photos", response_model=DiaryNotePhotoRead)
async def add_diary_note_photo(
    note_id: int,
    file: UploadFile = File(...),
    is_main: bool = Form(False),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DiaryNotePhoto:
    note = _get_diary_note_or_404(note_id, session)
    _ensure_note_owner(note, current_user)

    if len(note.photos) >= MAX_WORKOUT_ENTRY_PHOTOS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Можно загрузить не более "
                f"{MAX_WORKOUT_ENTRY_PHOTOS} фотографий."
            ),
        )

    url = await save_image(file, "diary_notes")

    if is_main:
        for existing_photo in note.photos:
            if existing_photo.is_main:
                existing_photo.is_main = False
                session.add(existing_photo)

    photo = DiaryNotePhoto(note_id=note_id, url=url, is_main=is_main)

    session.add(photo)
    session.commit()
    session.refresh(photo)

    return photo


@router.delete(
    "/notes/{note_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_diary_note_photo(
    note_id: int,
    photo_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    note = _get_diary_note_or_404(note_id, session)
    _ensure_note_owner(note, current_user)

    photo = session.get(DiaryNotePhoto, photo_id)

    if photo is None or photo.note_id != note_id:
        raise HTTPException(status_code=404, detail="Фото не найдено")

    delete_image(photo.url)
    session.delete(photo)
    session.commit()


@router.put(
    "/notes/{note_id}/photos/{photo_id}/set-main",
    response_model=DiaryNotePhotoRead,
)
def set_main_diary_note_photo(
    note_id: int,
    photo_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DiaryNotePhoto:
    """Делает фото заметки главным — тот же паттерн, что и
    set_main_workout_entry_photo выше."""
    note = _get_diary_note_or_404(note_id, session)
    _ensure_note_owner(note, current_user)

    target_photo = session.get(DiaryNotePhoto, photo_id)

    if target_photo is None or target_photo.note_id != note_id:
        raise HTTPException(status_code=404, detail="Фото не найдено")

    for photo in note.photos:
        if photo.is_main and photo.id != photo_id:
            photo.is_main = False
            session.add(photo)

    target_photo.is_main = True
    session.add(target_photo)

    session.commit()
    session.refresh(target_photo)

    return target_photo


# =====================================================================
# Личные теги
# =====================================================================

@router.get("/tags", response_model=List[PersonalTagRead])
def list_personal_tags(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[PersonalTag]:
    """
    В отличие от записей/заметок, чужие теги никому не показываются —
    это личный инструмент организации, у него нет аналога
    privacySettings на фронтенде, поэтому просто всегда "свои".
    """
    tags = session.exec(
        select(PersonalTag).where(PersonalTag.user_id == current_user.id)
    ).all()

    return list(tags)


def _validate_tag_name(
    name: str,
    current_user: User,
    session: Session,
    exclude_id: Optional[int] = None,
) -> str:
    trimmed = _normalize_tag_name(name)

    if len(trimmed) == 0:
        raise HTTPException(status_code=400, detail="Введите название тега.")

    if len(trimmed) > MAX_TAG_NAME_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Название тега не должно превышать "
                f"{MAX_TAG_NAME_LENGTH} символов."
            ),
        )

    existing = session.exec(
        select(PersonalTag).where(PersonalTag.user_id == current_user.id)
    ).all()

    for tag in existing:
        if tag.id == exclude_id:
            continue

        if tag.name.lower() == trimmed.lower():
            raise HTTPException(
                status_code=400,
                detail=f"Тег «{trimmed}» уже существует.",
            )

    return trimmed


@router.post("/tags", response_model=PersonalTagRead)
def create_personal_tag(
    data: PersonalTagCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PersonalTag:
    trimmed = _validate_tag_name(data.name, current_user, session)

    user_tags_count = session.exec(
        select(PersonalTag).where(PersonalTag.user_id == current_user.id)
    ).all()

    if len(user_tags_count) >= MAX_PERSONAL_TAGS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Достигнут лимит тегов. Вы можете удалить ненужный тег, "
                "чтобы создать новый."
            ),
        )

    tag = PersonalTag(user_id=current_user.id, name=trimmed)

    session.add(tag)
    session.commit()
    session.refresh(tag)

    return tag


def _get_personal_tag_or_404(tag_id: int, session: Session) -> PersonalTag:
    tag = session.get(PersonalTag, tag_id)

    if tag is None:
        raise HTTPException(status_code=404, detail="Тег не найден")

    return tag


def _rename_tag_everywhere(
    user_id: int, old_name: str, new_name: str, session: Session
) -> None:
    """
    Переименование тега применяется ко всем записям и заметкам
    пользователя, где он использовался — как renameTagInEntries и
    renameTagInNotes на фронтенде: новый тег не "создаётся" отдельно,
    просто у существующих записей меняется строка в списке tags.
    """
    entries = session.exec(
        select(WorkoutEntry).where(WorkoutEntry.user_id == user_id)
    ).all()

    for entry in entries:
        if old_name in entry.tags:
            entry.tags = [
                new_name if t == old_name else t for t in entry.tags
            ]
            # Убираем возможный дубль, если new_name уже был в списке.
            entry.tags = list(dict.fromkeys(entry.tags))
            session.add(entry)

    notes = session.exec(
        select(DiaryNote).where(DiaryNote.user_id == user_id)
    ).all()

    for note in notes:
        if old_name in note.tags:
            note.tags = [
                new_name if t == old_name else t for t in note.tags
            ]
            note.tags = list(dict.fromkeys(note.tags))
            session.add(note)


def _remove_tag_everywhere(
    user_id: int, tag_name: str, session: Session
) -> None:
    entries = session.exec(
        select(WorkoutEntry).where(WorkoutEntry.user_id == user_id)
    ).all()

    for entry in entries:
        if tag_name in entry.tags:
            entry.tags = [t for t in entry.tags if t != tag_name]
            session.add(entry)

    notes = session.exec(
        select(DiaryNote).where(DiaryNote.user_id == user_id)
    ).all()

    for note in notes:
        if tag_name in note.tags:
            note.tags = [t for t in note.tags if t != tag_name]
            session.add(note)


@router.put("/tags/{tag_id}", response_model=PersonalTagRead)
def rename_personal_tag(
    tag_id: int,
    data: PersonalTagUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PersonalTag:
    tag = _get_personal_tag_or_404(tag_id, session)

    if tag.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Изменять этот тег может только его владелец",
        )

    trimmed = _validate_tag_name(
        data.name, current_user, session, exclude_id=tag_id
    )

    if trimmed != tag.name:
        _rename_tag_everywhere(current_user.id, tag.name, trimmed, session)
        tag.name = trimmed
        session.add(tag)

    session.commit()
    session.refresh(tag)

    return tag


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_personal_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    tag = _get_personal_tag_or_404(tag_id, session)

    if tag.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Удалять этот тег может только его владелец",
        )

    _remove_tag_everywhere(current_user.id, tag.name, session)

    session.delete(tag)
    session.commit()


# =====================================================================
# Комментарии к записям дневника
# =====================================================================

def _delete_comments_for_record(
    record_id: int, record_type: DiaryRecordType, session: Session
) -> None:
    comments = session.exec(
        select(Comment).where(
            Comment.record_id == record_id,
            Comment.record_type == record_type,
        )
    ).all()

    for comment in comments:
        session.delete(comment)


@router.get("/comments/all", response_model=List[CommentRead])
def list_all_comments(session: Session = Depends(get_session)) -> List[Comment]:
    """
    Абсолютно все комментарии по всем записям и заметкам — без
    фильтров. Нужен главной странице (Home.tsx/HomeFeed) для счётчика
    комментариев у каждого элемента общей ленты: там одновременно
    показываются записи разных пользователей, делать по отдельному
    запросу на каждую было бы неоправданно.

    Публичный, без авторизации — то же обоснование, что и у
    GET /events/registrations: это не приватные данные (комментарии
    видно под любой открытой записью, включая чужие).

    Путь "/comments/all" не пересекается с "/comments/{comment_id}"
    (тот объявлен только для PUT/DELETE, не для GET), так что здесь,
    в отличие от /events/registrations, порядок объявления маршрутов
    ни на что не влияет.
    """
    return list(session.exec(select(Comment)).all())


@router.get("/comments", response_model=List[CommentRead])
def list_comments(
    record_id: int,
    record_type: DiaryRecordType,
    session: Session = Depends(get_session),
) -> List[Comment]:
    comments = session.exec(
        select(Comment).where(
            Comment.record_id == record_id,
            Comment.record_type == record_type,
        )
    ).all()

    return list(comments)


@router.post("/comments", response_model=CommentRead)
def create_comment(
    record_id: int,
    record_type: DiaryRecordType,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Comment:
    trimmed = data.text.strip()

    if len(trimmed) == 0:
        raise HTTPException(
            status_code=400, detail="Напишите текст комментария."
        )

    if len(trimmed) > COMMENT_MAX_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Комментарий не должен превышать "
                f"{COMMENT_MAX_LENGTH} символов."
            ),
        )

    # Комментировать можно только то, что реально существует.
    if record_type == DiaryRecordType.workout:
        _get_workout_entry_or_404(record_id, session)
    else:
        _get_diary_note_or_404(record_id, session)

    comment = Comment(
        record_id=record_id,
        record_type=record_type,
        user_id=current_user.id,
        text=trimmed,
    )

    session.add(comment)
    session.commit()
    session.refresh(comment)

    return comment


@router.put("/comments/{comment_id}", response_model=CommentRead)
def update_comment(
    comment_id: int,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Comment:
    comment = session.get(Comment, comment_id)

    if comment is None:
        raise HTTPException(status_code=404, detail="Комментарий не найден")

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Изменять этот комментарий может только его автор",
        )

    trimmed = data.text.strip()

    if len(trimmed) == 0:
        raise HTTPException(
            status_code=400, detail="Напишите текст комментария."
        )

    if len(trimmed) > COMMENT_MAX_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Комментарий не должен превышать "
                f"{COMMENT_MAX_LENGTH} символов."
            ),
        )

    comment.text = trimmed

    session.add(comment)
    session.commit()
    session.refresh(comment)

    return comment


@router.delete(
    "/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    comment = session.get(Comment, comment_id)

    if comment is None:
        raise HTTPException(status_code=404, detail="Комментарий не найден")

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Удалять этот комментарий может только его автор",
        )

    session.delete(comment)
    session.commit()
