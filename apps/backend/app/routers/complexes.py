from datetime import date, datetime, timezone
from typing import Iterable, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, delete, select

from app.auth import (
    ensure_admin,
    ensure_owner_or_admin,
    get_current_user,
    get_optional_current_user,
)
from app.database import get_session
from app.models import User
from app.models_notification import Notification
from app.notifications import notify_mentions
from app.models_complex import (
    Complex,
    ComplexComment,
    ComplexLeaderboard,
    ComplexLeaderboardRow,
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
    MovementType,
    TIME_LIKE_METRICS,
    apply_complex_update,
    complex_db_from_create,
    complex_from_db,
    compose_exercise_text,
    is_time_based,
    movements_from_exercises,
    scheme_exercise_ids,
    scheme_row_exercise_ids,
    validate_scheme,
)
from app.models_exercise import ExerciseDB
from app.models_diary import WorkoutEntry

router = APIRouter(prefix="/complexes", tags=["complexes"])


# =====================================================================
# Каталог (таблица ComplexDB, см. models_complex.py). Читать может
# кто угодно (даже не залогиненный — как и раньше, пока каталог был
# статичным списком), добавлять и редактировать — только
# администратор (см. ensure_admin в app/auth.py).
# =====================================================================

def _exercise_info(
    session: Session, ids: Iterable[str]
) -> dict[str, tuple[str, str]]:
    """
    Название и тип движения упражнений по id (id → (название, тип)) —
    одним запросом на любое число комплексов.
    """
    wanted = set(ids)

    if not wanted:
        return {}

    rows = session.exec(
        select(ExerciseDB.id, ExerciseDB.name, ExerciseDB.movement_type).where(
            ExerciseDB.id.in_(wanted)
        )
    ).all()

    return {
        exercise_id: (name, movement_type)
        for exercise_id, name, movement_type in rows
    }


def _exercise_names(session: Session, ids: Iterable[str]) -> dict[str, str]:
    """Названия упражнений по id."""
    return {
        exercise_id: name
        for exercise_id, (name, _) in _exercise_info(session, ids).items()
    }


def _ordered_exercise_ids(complex_def: Complex) -> List[str]:
    """
    Упражнения комплекса в порядке схемы, с повторами (одно упражнение
    может стоять в ней несколько раз); у комплекса без схемы — по
    списку exercise_ids.
    """
    return scheme_row_exercise_ids(complex_def.scheme) or complex_def.exercise_ids


def _movements_for(
    ordered_ids: List[str], info: dict[str, tuple[str, str]]
) -> List[str]:
    """Типы движения комплекса по упражнениям (см. movements_from_exercises)."""
    return movements_from_exercises(
        info[exercise_id][1] for exercise_id in ordered_ids if exercise_id in info
    )


def _to_complex(row: ComplexDB, info: dict[str, tuple[str, str]]) -> Complex:
    """
    Комплекс для ответа API. Если к нему привязаны упражнения из базы,
    текст exercise собирается из их ТЕКУЩИХ названий, а типы движения
    (movements) — из их ТЕКУЩИХ типов, а не берутся из сохранённого:
    иначе после переименования упражнения или смены его типа в
    карточке комплекса осталось бы старое. У комплекса без привязки
    (заведённого по-старому) остаются сохранённые текст и типы.
    """
    complex_def = complex_from_db(row)

    ordered_ids = _ordered_exercise_ids(complex_def)

    linked_names = [
        info[exercise_id][0] for exercise_id in ordered_ids if exercise_id in info
    ]

    if linked_names:
        complex_def.exercise = compose_exercise_text(linked_names)
        complex_def.movements = [
            MovementType(movement) for movement in _movements_for(ordered_ids, info)
        ]

    return complex_def


def _resolve_exercise_names(ids: List[str], session: Session) -> List[str]:
    """
    Проверяет, что все упражнения есть в базе упражнений, и возвращает
    их названия в том же порядке и с теми же повторами: одно упражнение
    может стоять в схеме комплекса несколько раз (даже подряд).
    """
    if not ids:
        return []

    names = _exercise_names(session, ids)
    missing = list(
        dict.fromkeys(exercise_id for exercise_id in ids if exercise_id not in names)
    )

    if missing:
        raise HTTPException(
            status_code=422,
            detail=(
                "Упражнения не найдены в базе упражнений: "
                + ", ".join(missing)
            ),
        )

    return [names[exercise_id] for exercise_id in ids]


def _validate_scheme_or_422(scheme) -> None:
    try:
        validate_scheme(scheme)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))


def _ensure_has_exercises(row: ComplexDB) -> None:
    """У комплекса должны быть упражнения: из базы или (по-старому) текстом."""
    if not row.exercise_ids and not (row.exercise or "").strip():
        raise HTTPException(
            status_code=422,
            detail="Выберите хотя бы одно упражнение комплекса.",
        )


@router.get("/", response_model=List[Complex])
def list_complexes(session: Session = Depends(get_session)) -> List[Complex]:
    """Полный каталог комплексов — одинаковый для всех пользователей."""
    rows = session.exec(select(ComplexDB)).all()

    info = _exercise_info(
        session,
        (exercise_id for row in rows for exercise_id in (row.exercise_ids or [])),
    )

    return [_to_complex(row, info) for row in rows]


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
    row = _get_complex_db_or_404(complex_id, session)

    return _to_complex(row, _exercise_info(session, row.exercise_ids or []))


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

    _validate_scheme_or_422(data.scheme)

    # Есть схема — упражнения берём из неё (с повторами, в её порядке);
    # нет — прежний способ: список exercise_ids.
    row_ids = scheme_row_exercise_ids(data.scheme) or data.exercise_ids
    exercise_names = _resolve_exercise_names(row_ids, session)

    row = complex_db_from_create(data)

    if data.scheme:
        # Список разных упражнений — производная схемы, а не отдельный
        # ввод: на нём держатся ссылки, мышцы и защита удаления упражнения.
        row.exercise_ids = scheme_exercise_ids(data.scheme)

    if exercise_names:
        # Текст для комплекса с упражнениями из базы всегда собираем
        # сами — присланный клиентом (если он есть) игнорируем.
        row.exercise = compose_exercise_text(exercise_names)

        # Тип движения комплекса — типы движения его упражнений.
        row.movements = _movements_for(row_ids, _exercise_info(session, row_ids))

    _ensure_has_exercises(row)

    session.add(row)
    session.commit()
    session.refresh(row)

    return _to_complex(row, _exercise_info(session, row.exercise_ids or []))


@router.put("/{complex_id}", response_model=Complex)
def update_complex(
    complex_id: str,
    data: ComplexUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Complex:
    ensure_admin(current_user, "Редактировать комплексы может только администратор")

    row = _get_complex_db_or_404(complex_id, session)

    if data.scheme is not None:
        _validate_scheme_or_422(data.scheme)
    elif data.exercise_ids is not None and row.scheme:
        # Упражнения комплекса со схемой определяются схемой; отдельный
        # список разошёлся бы с ней.
        raise HTTPException(
            status_code=422,
            detail=(
                "У комплекса есть схема — упражнения меняются в схеме "
                "(поле scheme), а не отдельным списком."
            ),
        )

    if data.scheme:
        row_ids = scheme_row_exercise_ids(data.scheme)
    else:
        row_ids = data.exercise_ids

    exercise_names = (
        _resolve_exercise_names(row_ids, session) if row_ids is not None else None
    )

    apply_complex_update(row, data)

    if data.scheme:
        row.exercise_ids = scheme_exercise_ids(data.scheme)

    if exercise_names:
        row.exercise = compose_exercise_text(exercise_names)
        row.movements = _movements_for(row_ids, _exercise_info(session, row_ids))

    _ensure_has_exercises(row)

    session.add(row)
    session.commit()
    session.refresh(row)

    return _to_complex(row, _exercise_info(session, row.exercise_ids or []))


# =====================================================================
# Лучший результат
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


def _best_completion_key(complex_def: Complex, completion: ComplexCompletion):
    """
    Ключ сортировки для определения лучшего результата (п.21
    документа): для временных комплексов — меньшее время, для
    объёмных — большее значение основного показателя.
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

    return score


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
    либо попытка записать результат задним/передним числом.
    """
    if completed_date > datetime.now(timezone.utc).date():
        raise HTTPException(
            status_code=400,
            detail="Дата выполнения не может быть в будущем.",
        )


@router.delete("/{complex_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_complex(
    complex_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """
    Удаляет комплекс целиком. Необратимо: вместе с ним удаляются

    - выполнения комплекса у всех пользователей (результат без
      комплекса не показать и не пересчитать);
    - комментарии к комплексу;
    - уведомления об упоминаниях на его странице (они вели бы на
      несуществующую страницу).

    Записи дневника НЕ затрагиваются (п.26 документа): запись остаётся,
    просто пропадает привязанное к ней выполнение комплекса.
    """

    ensure_admin(current_user, "Удалять комплексы может только администратор")

    row = _get_complex_db_or_404(complex_id, session)

    session.exec(
        delete(ComplexCompletion).where(ComplexCompletion.complex_id == complex_id)
    )
    session.exec(
        delete(ComplexComment).where(ComplexComment.complex_id == complex_id)
    )
    session.exec(
        delete(Notification).where(Notification.target_url == f"/complexes/{complex_id}")
    )

    session.delete(row)
    session.commit()


# =====================================================================
# Рейтинг комплекса
# =====================================================================

# Сколько первых мест показывает компактный рейтинг на странице комплекса.
LEADERBOARD_TOP = 5


def _leaderboard_metric(complex_def: Complex) -> tuple[Optional[MetricType], bool]:
    """
    Показатель, по которому сравнивают пользователей, и направление:
    True — чем больше, тем лучше. У временного комплекса — время
    (меньше лучше), у остальных — первый показатель результата.
    """

    if is_time_based(complex_def):
        metric = (
            MetricType.time
            if MetricType.time in complex_def.result_metrics
            else MetricType.duration
        )

        return metric, False

    if complex_def.result_metrics:
        return complex_def.result_metrics[0], True

    return None, True


def _ranked_leaderboard(
    complex_def: Complex, session: Session, viewer: Optional[User]
) -> List[ComplexLeaderboardRow]:
    """
    Все участники по убыванию мест: у каждого пользователя берётся его
    лучшее выполнение. При равных очках выше тот, кто набрал их раньше
    (по дате выполнения, затем по порядку записи), поэтому места не
    делятся: 4, 5, 6, а не 4, 4, 6.
    """

    metric, higher_is_better = _leaderboard_metric(complex_def)

    if metric is None:
        return []

    records = session.exec(
        select(ComplexCompletion, User.nickname)
        .join(User, User.id == ComplexCompletion.user_id)
        .where(ComplexCompletion.complex_id == complex_def.id)
    ).all()

    best: dict[int, tuple[tuple, int, str]] = {}

    for completion, nickname in records:
        value = _metric_value(completion, metric)

        if value is None:
            continue

        sort_key = (
            -value if higher_is_better else value,
            completion.completed_date,
            completion.id,
        )
        current = best.get(completion.user_id)

        if current is None or sort_key < current[0]:
            best[completion.user_id] = (sort_key, int(value), nickname)

    ordered = sorted(best.items(), key=lambda item: item[1][0])

    return [
        ComplexLeaderboardRow(
            rank=position,
            user_id=user_id,
            nickname=nickname,
            value=value,
            is_me=viewer is not None and user_id == viewer.id,
        )
        for position, (user_id, (_key, value, nickname)) in enumerate(
            ordered, start=1
        )
    ]


def _compact_leaderboard(
    ranked: List[ComplexLeaderboardRow],
) -> List[ComplexLeaderboardRow]:
    """
    Рейтинг для страницы комплекса: первые пять мест, затем текущий
    пользователь (если он не в пятёрке) и последнее место (если оно ещё
    не показано). То есть 5–7 строк:

    - обычный случай — 5 лучших, вы, последний (7);
    - вы в пятёрке или вы последний — 6;
    - участников не больше пяти — все они.
    """

    top = ranked[:LEADERBOARD_TOP]
    rows = list(top)

    me = next((row for row in ranked if row.is_me), None)

    if me is not None and me.rank > LEADERBOARD_TOP:
        rows.append(me)

    last = ranked[-1] if ranked else None

    if last is not None and last.rank > LEADERBOARD_TOP and not last.is_me:
        rows.append(last)

    return rows


@router.get("/{complex_id}/leaderboard", response_model=ComplexLeaderboard)
def get_leaderboard(
    complex_id: str,
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> ComplexLeaderboard:
    """
    Компактный рейтинг комплекса (см. _compact_leaderboard). Открыт
    всем, включая гостей: показываются только ник и очки лучшего
    выполнения, не история.
    """

    complex_def = _get_complex_or_404(complex_id, session)
    ranked = _ranked_leaderboard(complex_def, session, viewer)

    return ComplexLeaderboard(
        total=len(ranked), rows=_compact_leaderboard(ranked)
    )


@router.get("/{complex_id}/leaderboard/all", response_model=ComplexLeaderboard)
def get_full_leaderboard(
    complex_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    viewer: Optional[User] = Depends(get_optional_current_user),
) -> ComplexLeaderboard:
    """Рейтинг по всем пользователям, постранично (страница «Все результаты»)."""

    complex_def = _get_complex_or_404(complex_id, session)
    ranked = _ranked_leaderboard(complex_def, session, viewer)

    return ComplexLeaderboard(
        total=len(ranked), rows=ranked[offset : offset + limit]
    )


@router.post("/{complex_id}/completions", response_model=ComplexCompletionRead)
def create_completion(
    complex_id: str,
    data: ComplexCompletionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ComplexCompletion:
    # Только проверка, что комплекс существует (иначе 404).
    _get_complex_or_404(complex_id, session)

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

    # Только проверка, что комплекс существует (иначе 404).
    _get_complex_or_404(completion.complex_id, session)

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
    complex_ = _get_complex_or_404(complex_id, session)

    trimmed_text = _validate_comment_text(data.text)

    comment = ComplexComment(
        complex_id=complex_id,
        user_id=current_user.id,
        text=trimmed_text,
    )

    session.add(comment)

    notify_mentions(
        session,
        text=trimmed_text,
        actor=current_user,
        target_url=f"/complexes/{complex_id}",
        target_title=complex_.name,
    )

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
