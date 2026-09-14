from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import (
    ensure_admin,
    ensure_owner_or_admin,
    get_current_user,
    get_optional_current_user,
)
from app.database import get_session
from app.models import User
from app.models_complex import (
    ComparisonOperator,
    Complex,
    ComplexComment,
    ComplexCommentCreate,
    ComplexCommentRead,
    ComplexCompletion,
    ComplexCompletionCreate,
    ComplexCompletionRead,
    ComplexCompletionUpdate,
    ComplexCreate,
    ComplexDB,
    ComplexUpdate,
    MetricType,
    TIME_LIKE_METRICS,
    apply_complex_update,
    complex_db_from_create,
    complex_from_db,
    is_time_based,
)
from app.models_diary import WorkoutEntry

router = APIRouter(prefix="/complexes", tags=["complexes"])


# =====================================================================
# Каталог (таблица ComplexDB, см. models_complex.py). Читать может
# кто угодно (даже не залогиненный — как и раньше, пока каталог был
# статичным списком), добавлять и редактировать — только
# администратор (см. ensure_admin в app/auth.py).
# =====================================================================

@router.get("/", response_model=List[Complex])
def list_complexes(session: Session = Depends(get_session)) -> List[Complex]:
    """Полный каталог комплексов — одинаковый для всех пользователей."""
    rows = session.exec(select(ComplexDB)).all()
    return [complex_from_db(row) for row in rows]


def _get_complex_db_or_404(complex_id: str, session: Session) -> ComplexDB:
    row = session.get(ComplexDB, complex_id)

    if row is None:
        raise HTTPException(status_code=404, detail="Комплекс не найден")

    return row


def _get_complex_or_404(complex_id: str, session: Session) -> Complex:
    return complex_from_db(_get_complex_db_or_404(complex_id, session))


@router.get("/{complex_id}", response_model=Complex)
def get_complex(
    complex_id: str, session: Session = Depends(get_session)
) -> Complex:
    return _get_complex_or_404(complex_id, session)


@router.post("/", response_model=Complex)
def create_complex(
    data: ComplexCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Complex:
    ensure_admin(current_user, "Добавлять комплексы может только администратор")

    if session.get(ComplexDB, data.id) is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Комплекс с id «{data.id}» уже существует.",
        )

    row = complex_db_from_create(data)

    session.add(row)
    session.commit()
    session.refresh(row)

    return complex_from_db(row)


@router.put("/{complex_id}", response_model=Complex)
def update_complex(
    complex_id: str,
    data: ComplexUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Complex:
    ensure_admin(current_user, "Редактировать комплексы может только администратор")

    row = _get_complex_db_or_404(complex_id, session)

    apply_complex_update(row, data)

    session.add(row)
    session.commit()
    session.refresh(row)

    return complex_from_db(row)


# =====================================================================
# Расчёт звёзд и лучшего результата
# =====================================================================

_METRIC_FIELDS = {
    MetricType.time: "result_time_seconds",
    MetricType.reps: "result_reps",
    MetricType.sets: "result_sets",
    MetricType.rounds: "result_rounds",
    MetricType.duration: "result_duration_seconds",
    MetricType.count: "result_count",
}


def _metric_value(data, metric: MetricType) -> Optional[float]:
    return getattr(data, _METRIC_FIELDS[metric])


def _compare(value: float, operator: ComparisonOperator, target: float) -> bool:
    if operator == ComparisonOperator.lte:
        return value <= target
    if operator == ComparisonOperator.gte:
        return value >= target

    return value == target


def _calculate_stars(complex_def: Complex, data) -> int:
    """
    Сравнивает введённый пользователем результат с условиями
    комплекса. 1 звезда присваивается уже за сам факт фиксации
    выполнения (п.9 документа); 2 и 3 звёзды — если выполнено
    соответствующее условие. Проверяем от старшего условия к
    младшему и останавливаемся на первом выполненном.
    """

    stars = 1

    for condition in sorted(
        complex_def.star_conditions, key=lambda c: c.stars, reverse=True
    ):
        value = _metric_value(data, condition.metric)

        if value is None:
            continue

        if _compare(value, condition.operator, condition.value):
            stars = condition.stars
            break

    return stars


def _best_completion_key(complex_def: Complex, completion: ComplexCompletion):
    """
    Ключ сортировки для определения лучшего результата (п.21
    документа): сперва больше звёзд, затем — для временных
    комплексов меньшее время, для объёмных большее значение
    основного показателя.
    """

    if is_time_based(complex_def):
        metric = (
            MetricType.time
            if MetricType.time in complex_def.result_metrics
            else MetricType.duration
        )
        value = _metric_value(completion, metric)
        score = float("-inf") if value is None else -value
    else:
        metric = complex_def.result_metrics[0] if complex_def.result_metrics else None
        value = _metric_value(completion, metric) if metric else None
        score = value if value is not None else float("-inf")

    return (completion.stars, score)


# =====================================================================
# Выполнения комплекса
# =====================================================================

def _get_completion_or_404(
    completion_id: int, session: Session
) -> ComplexCompletion:
    completion = session.get(ComplexCompletion, completion_id)

    if completion is None:
        raise HTTPException(status_code=404, detail="Выполнение не найдено")

    return completion


def _ensure_completion_owner(
    completion: ComplexCompletion, current_user: User
) -> None:
    if completion.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Изменять это выполнение может только его автор",
        )


def _ensure_diary_entry_belongs_to_user(
    entry_id: int, current_user: User, session: Session, *, expected_date=None
) -> WorkoutEntry:
    """
    Подтверждающей записью можно указать только собственную запись
    дневника — иначе легко было бы «прикрепить» чужую тренировку
    в качестве подтверждения своего выполнения. Если передана
    expected_date, дополнительно проверяем, что запись относится к
    той же дате, что и дата выполнения комплекса (комплекс должен
    быть привязан именно к тренировке этого дня).
    """

    entry = session.get(WorkoutEntry, entry_id)

    if entry is None:
        raise HTTPException(status_code=404, detail="Запись дневника не найдена")

    if entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Связать можно только собственную запись дневника",
        )

    if expected_date is not None and entry.date != expected_date:
        raise HTTPException(
            status_code=400,
            detail="Запись дневника должна относиться к дате выполнения комплекса",
        )

    return entry


def _ensure_completed_date_is_not_future(completed_date: date) -> None:
    """
    Комплекс нельзя "выполнить" в будущем — как и с датой тренировки
    в дневнике (см. аналогичную идею в diary.py), это либо опечатка,
    либо попытка обойти условия звёзд задним/передним числом.
    """
    if completed_date > datetime.now(timezone.utc).date():
        raise HTTPException(
            status_code=400,
            detail="Дата выполнения не может быть в будущем.",
        )


@router.post("/{complex_id}/completions", response_model=ComplexCompletionRead)
def create_completion(
    complex_id: str,
    data: ComplexCompletionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ComplexCompletion:
    complex_def = _get_complex_or_404(complex_id, session)

    _ensure_completed_date_is_not_future(data.completed_date)

    # Комплекс не может существовать без подтверждающей тренировки —
    # выполнение обязательно привязывается к записи дневника уже в
    # момент создания (см. основной принцип системы, UX-документ п.2).
    if data.diary_entry_id is None:
        raise HTTPException(
            status_code=400,
            detail="Выполнение комплекса нужно привязать к записи дневника.",
        )

    _ensure_diary_entry_belongs_to_user(
        data.diary_entry_id,
        current_user,
        session,
        expected_date=data.completed_date,
    )

    completion = ComplexCompletion(
        **data.model_dump(),
        user_id=current_user.id,
    )
    completion.stars = _calculate_stars(complex_def, completion)

    session.add(completion)
    session.commit()
    session.refresh(completion)

    return completion


@router.get(
    "/{complex_id}/completions", response_model=List[ComplexCompletionRead]
)
def list_completions(
    complex_id: str,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[ComplexCompletion]:
    """
    История выполнений одного комплекса. Как и личные теги, история
    выполнений в MVP — приватный инструмент прогрессии: без user_id
    отдаём историю текущего пользователя, с user_id — только если
    это тоже текущий пользователь (более широкая публичность не
    нужна, см. п.29 документа — публично видна только сама лента
    дневника с блоком комплекса, а не отдельная история).
    """

    _get_complex_or_404(complex_id, session)

    target_user_id = user_id if user_id is not None else current_user.id

    if target_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="История выполнений доступна только самому пользователю",
        )

    completions = session.exec(
        select(ComplexCompletion).where(
            ComplexCompletion.complex_id == complex_id,
            ComplexCompletion.user_id == target_user_id,
        )
    ).all()

    return sorted(completions, key=lambda c: c.completed_date, reverse=True)


@router.get("/{complex_id}/best", response_model=Optional[ComplexCompletionRead])
def get_best_completion(
    complex_id: str,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Optional[ComplexCompletion]:
    complex_def = _get_complex_or_404(complex_id, session)

    target_user_id = user_id if user_id is not None else current_user.id

    if target_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Лучший результат доступен только самому пользователю",
        )

    completions = session.exec(
        select(ComplexCompletion).where(
            ComplexCompletion.complex_id == complex_id,
            ComplexCompletion.user_id == target_user_id,
        )
    ).all()

    if not completions:
        return None

    return max(completions, key=lambda c: _best_completion_key(complex_def, c))


@router.put("/completions/{completion_id}", response_model=ComplexCompletionRead)
def update_completion(
    completion_id: int,
    data: ComplexCompletionUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ComplexCompletion:
    completion = _get_completion_or_404(completion_id, session)
    _ensure_completion_owner(completion, current_user)

    complex_def = _get_complex_or_404(completion.complex_id, session)

    updates = data.model_dump(exclude_unset=True, exclude={"clear_diary_entry"})

    # Итоговая дата выполнения (может меняться этим же запросом) — по
    # ней проверяем, что привязанная запись дневника ей соответствует.
    final_completed_date = updates.get("completed_date", completion.completed_date)

    _ensure_completed_date_is_not_future(final_completed_date)

    if data.clear_diary_entry:
        completion.diary_entry_id = None
        updates.pop("diary_entry_id", None)
    elif updates.get("diary_entry_id") is not None:
        _ensure_diary_entry_belongs_to_user(
            updates["diary_entry_id"],
            current_user,
            session,
            expected_date=final_completed_date,
        )
    elif completion.diary_entry_id is not None and "completed_date" in updates:
        # Дата изменилась, а привязка — нет: убеждаемся, что старая
        # запись дневника всё ещё относится к новой дате.
        _ensure_diary_entry_belongs_to_user(
            completion.diary_entry_id,
            current_user,
            session,
            expected_date=final_completed_date,
        )

    for field_name, value in updates.items():
        setattr(completion, field_name, value)

    # Результат мог измениться — пересчитываем звёзды (п.25 документа:
    # «После изменения результата система пересчитывает звёзды»).
    completion.stars = _calculate_stars(complex_def, completion)
    completion.updated_at = datetime.now(timezone.utc)

    session.add(completion)
    session.commit()
    session.refresh(completion)

    return completion


@router.delete(
    "/completions/{completion_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_completion(
    completion_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """
    Удаляет только выполнение комплекса. Связанная запись дневника
    никогда не затрагивается (п.26 документа — это принципиально
    важное правило системы).
    """

    completion = _get_completion_or_404(completion_id, session)
    _ensure_completion_owner(completion, current_user)

    session.delete(completion)
    session.commit()


@router.get(
    "/completions/by-entry/{entry_id}",
    response_model=List[ComplexCompletionRead],
)
def list_completions_for_diary_entry(
    entry_id: int,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> List[ComplexCompletion]:
    """
    Комплексы, выполнение которых подтверждено конкретной записью
    дневника — используется блоком «Выполненный комплекс» на
    странице записи (п.23 документа). Видимость подчиняется тем же
    правилам приватности, что и сама запись дневника.
    """

    entry = session.get(WorkoutEntry, entry_id)

    if entry is None:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    owner = session.get(User, entry.user_id)

    if owner is not None and not owner.diary_visible:
        if viewer is None or viewer.id != owner.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Дневник этого пользователя скрыт настройками приватности",
            )

    completions = session.exec(
        select(ComplexCompletion).where(
            ComplexCompletion.diary_entry_id == entry_id
        )
    ).all()

    return list(completions)


def clear_diary_link(entry_id: int, session: Session) -> None:
    """
    Вызывается из routers/diary.py при удалении записи дневника.
    Отвязывает выполнения от удаляемой записи, не трогая сами
    выполнения (п.27 документа: «выполнение комплекса сохраняется,
    но становится без подтверждающей записи»).
    """

    completions = session.exec(
        select(ComplexCompletion).where(
            ComplexCompletion.diary_entry_id == entry_id
        )
    ).all()

    for completion in completions:
        completion.diary_entry_id = None
        session.add(completion)


# =====================================================================
# Комментарии к комплексу
# =====================================================================

COMMENT_MAX_LENGTH = 500


def _validate_comment_text(text: str) -> str:
    trimmed = text.strip()

    if len(trimmed) == 0:
        raise HTTPException(status_code=400, detail="Напишите текст комментария.")

    if len(trimmed) > COMMENT_MAX_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Комментарий не должен превышать "
                f"{COMMENT_MAX_LENGTH} символов."
            ),
        )

    return trimmed


@router.get("/{complex_id}/comments", response_model=List[ComplexCommentRead])
def list_complex_comments(
    complex_id: str,
    session: Session = Depends(get_session),
) -> List[ComplexComment]:
    """
    От старых к новым — как обычная переписка (тот же порядок, что
    у комментариев дневника, см. utils/comments.ts на фронтенде).
    Публичный, без авторизации: комментарии под комплексом видны
    так же, как сам каталог (GET /complexes/), которому авторизация
    тоже не нужна.
    """
    _get_complex_or_404(complex_id, session)

    comments = session.exec(
        select(ComplexComment)
        .where(ComplexComment.complex_id == complex_id)
        .order_by(ComplexComment.created_at)
    ).all()

    return list(comments)


@router.post("/{complex_id}/comments", response_model=ComplexCommentRead)
def create_complex_comment(
    complex_id: str,
    data: ComplexCommentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ComplexComment:
    """
    Один и тот же пользователь может оставить сколько угодно
    комментариев под одним комплексом — как и с отзывами площадок,
    отдельного ограничения "один комментарий на комплекс" нет.
    """
    _get_complex_or_404(complex_id, session)

    trimmed_text = _validate_comment_text(data.text)

    comment = ComplexComment(
        complex_id=complex_id,
        user_id=current_user.id,
        text=trimmed_text,
    )

    session.add(comment)
    session.commit()
    session.refresh(comment)

    return comment


def _get_complex_comment_or_404(comment_id: int, session: Session) -> ComplexComment:
    comment = session.get(ComplexComment, comment_id)

    if comment is None:
        raise HTTPException(status_code=404, detail="Комментарий не найден")

    return comment


@router.put("/comments/{comment_id}", response_model=ComplexCommentRead)
def update_complex_comment(
    comment_id: int,
    data: ComplexCommentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ComplexComment:
    comment = _get_complex_comment_or_404(comment_id, session)

    # Строго только автор, даже для админа — как и с отзывами площадок
    # (см. update_review в routers/reviews.py): подменить чужой текст
    # от чужого имени не должно быть можно даже модератору.
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
def delete_complex_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    comment = _get_complex_comment_or_404(comment_id, session)

    # В отличие от редактирования выше — удалить чужой комментарий
    # модератору можно (это модерация, а не подмена авторства).
    ensure_owner_or_admin(
        comment.user_id,
        current_user,
        detail="Удалять этот комментарий может только его автор",
    )

    session.delete(comment)
    session.commit()
