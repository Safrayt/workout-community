import logging
import os

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import inspect, select, text, update

logger = logging.getLogger(__name__)

# Без Docker (обычная локальная разработка) переменная DATABASE_URL не
# задана, и используется SQLite — просто файл на диске, не требует
# установки отдельного сервера базы данных. Файл появится в
# apps/backend после первого запуска и в git не попадёт (см.
# .gitignore).
#
# В Docker-проде (см. docker-compose.yml) переменная указывает на
# PostgreSQL, поднятый отдельным контейнером — он лучше SQLite
# справляется с несколькими одновременными пользователями, пишущими
# в базу параллельно, и на нём проще потом масштабироваться (например,
# вынести базу на отдельный сервер). См. DEPLOY.md, раздел "Миграция
# на PostgreSQL", если переходите с уже работающего SQLite-сайта.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./app.db")

IS_SQLITE = DATABASE_URL.startswith("sqlite")

# connect_args с check_same_thread нужен только для SQLite: по
# умолчанию SQLite разрешает работу с соединением только из того
# потока, где оно было создано, а FastAPI может обращаться к базе из
# разных потоков. Для PostgreSQL этот параметр не нужен (и вызовет
# ошибку, если его передать — драйвер psycopg2 его не знает).
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    # pool_pre_ping полезен для "настоящего" сервера БД (PostgreSQL):
    # проверяет, что соединение из пула ещё живо, прежде чем его
    # использовать — иначе после долгого простоя или перезапуска
    # контейнера с базой первый запрос мог бы упасть с ошибкой
    # "соединение разорвано". Для SQLite (файл, а не сетевой сервер)
    # это не нужно и в pool_pre_ping не участвует.
    pool_pre_ping=not IS_SQLITE,
)


def _add_column_if_missing(
    connection, table_name: str, column_name: str, column_ddl: str
) -> None:
    """
    Добавляет колонку через ALTER TABLE, только если её ещё нет —
    безопасно вызывать многократно (в т.ч. на каждом старте
    приложения). inspect() работает одинаково что на SQLite, что на
    Postgres — в отличие от старой версии этой миграции, написанной
    только под SQLite (PRAGMA table_info).
    """
    inspector = inspect(connection)
    existing_columns = {
        column["name"] for column in inspector.get_columns(table_name)
    }

    if column_name not in existing_columns:
        connection.exec_driver_sql(
            # Название таблицы и колонки — в двойных кавычках: "user" —
            # зарезервированное слово в PostgreSQL (хотя не в SQLite),
            # без кавычек ALTER TABLE падает с ошибкой синтаксиса именно
            # на Postgres. Двойные кавычки — стандартный SQL, работают
            # одинаково на обоих движках.
            f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {column_ddl}'
        )
        connection.commit()


# Типы движения упражнений, которые убрали из списка допустимых
# (models_exercise.MovementType), и на какие заменять их в уже
# существующих строках. Нужно потому, что ExerciseRead.movement_type
# — обычная строка: сервер значение не проверяет, а интерфейс ищет
# подпись и цвет типа в своём списке, и для неизвестного значения
# страница упражнения падает. Так что "осиротевшее" значение в базе
# надо перевести в существующее.
#
#   hipFlexion ("Сгибания бедра") → crunch ("Скручивания"): тип был
#   добавлен и убран; подъёмы коленей в висе (единственные упражнения
#   из сида, которые в него переводились) раньше были скручиваниями.
REMOVED_MOVEMENT_TYPES = {
    "hipFlexion": "crunch",
}


def _replace_removed_movement_types(connection) -> int:
    """
    Переводит упражнения с удалёнными типами движения (см.
    REMOVED_MOVEMENT_TYPES) на их замену. Возвращает, сколько строк
    изменено. Безопасно вызывать многократно: когда править нечего,
    ничего не делает. Запрос с именованными параметрами и названиями в
    кавычках — одинаково работает на SQLite и на PostgreSQL.
    """
    changed = 0

    for removed, replacement in REMOVED_MOVEMENT_TYPES.items():
        result = connection.execute(
            text(
                'UPDATE "exercise" SET "movement_type" = :replacement '
                'WHERE "movement_type" = :removed'
            ),
            {"replacement": replacement, "removed": removed},
        )
        changed += result.rowcount or 0

    if changed:
        connection.commit()
        logger.warning(
            "Упражнений с удалённым типом движения переведено на замену: %s "
            "(%s)",
            changed,
            ", ".join(
                f"{removed} → {replacement}"
                for removed, replacement in REMOVED_MOVEMENT_TYPES.items()
            ),
        )

    return changed


def _link_seed_complexes_to_exercises(connection) -> int:
    """
    Переносит в уже существующую базу структурированную схему и связь с
    упражнениями у стартовых комплексов (SEED_COMPLEXES): комплексы,
    заведённые до этого, хранят только текст (а затем — только список
    упражнений без схемы). Возвращает, сколько комплексов обновлено.

    Трогает комплекс, только если у него ещё нет схемы и администратор
    не успел выбрать для него другие упражнения (иначе затёрли бы его
    выбор), и если в базе упражнений есть ВСЕ нужные упражнения (иначе
    получилась бы схема с дырой). Безопасно вызывать многократно.
    Через Core-запросы с типом колонки JSON, а не сырой SQL: JSON
    записывается по-разному на SQLite и PostgreSQL.
    """
    # Импорт внутри: модели импортируют этот модуль (get_session), и
    # на верхнем уровне получился бы цикл.
    from app.models_complex import SEED_COMPLEXES, ComplexDB, scheme_exercise_ids
    from app.models_exercise import ExerciseDB

    complexes = ComplexDB.__table__
    exercises = ExerciseDB.__table__
    linked = 0

    for seed in SEED_COMPLEXES:
        seed_ids = scheme_exercise_ids(seed.scheme) if seed.scheme else list(seed.exercise_ids)

        if not seed_ids:
            continue

        current = connection.execute(
            select(complexes.c.exercise_ids, complexes.c.scheme).where(
                complexes.c.id == seed.id
            )
        ).first()

        if current is None:
            # Комплекса нет в базе (администратор его не заводил).
            continue

        current_ids, current_scheme = current[0] or [], current[1] or []

        if current_scheme:
            # Схема уже есть — не трогаем.
            continue

        if current_ids and list(current_ids) != seed_ids:
            # Администратор выбрал для комплекса другие упражнения.
            continue

        existing = set(
            connection.execute(
                select(exercises.c.id).where(exercises.c.id.in_(seed_ids))
            ).scalars()
        )

        if not set(seed_ids) <= existing:
            continue

        values = {"exercise_ids": seed_ids}

        if seed.scheme:
            values["scheme"] = [block.model_dump(mode="json") for block in seed.scheme]

        connection.execute(
            update(complexes).where(complexes.c.id == seed.id).values(**values)
        )
        linked += 1

    if linked:
        connection.commit()
        logger.warning(
            "Комплексов обновлено (схема и связь с базой упражнений): %s", linked
        )

    return linked


def _refresh_complex_movements(connection) -> int:
    """
    Переводит типы движения комплексов на актуальную классификацию
    («Тяговые», «Жимовые», «Отведения» и т.д. — те же, что у
    упражнений). Раньше администратор выбирал для комплекса «Тяга /
    Жим / Ноги» вручную; теперь тип комплекса — типы движения его
    упражнений.

    - у комплекса с упражнениями из базы типы пересчитываются по ним
      (в порядке схемы);
    - у комплекса без привязки к базе упражнений старые значения
      переводятся: «press» → «push», «legs» отбрасывается (однозначно не
      переводится, см. models_complex._LEGACY_MOVEMENT_VALUES).

    Возвращает, сколько комплексов изменено. Безопасно вызывать
    многократно: когда править нечего, ничего не делает.
    """
    from app.models_complex import (
        ComplexDB,
        movements_from_exercises,
        normalize_stored_movements,
    )
    from app.models_exercise import ExerciseDB

    complexes = ComplexDB.__table__
    exercises = ExerciseDB.__table__
    rows = connection.execute(
        select(
            complexes.c.id,
            complexes.c.movements,
            complexes.c.exercise_ids,
            complexes.c.scheme,
        )
    ).all()

    movement_by_exercise = dict(
        connection.execute(
            select(exercises.c.id, exercises.c.movement_type)
        ).all()
    )

    changed = 0

    for complex_id, stored, exercise_ids, scheme in rows:
        # Упражнения в порядке схемы (с повторами); без схемы — по списку.
        ordered_ids = [
            item.get("exercise_id")
            for block in (scheme or [])
            for item in (block.get("items") or [])
        ] or list(exercise_ids or [])

        linked = [
            movement_by_exercise[exercise_id]
            for exercise_id in ordered_ids
            if exercise_id in movement_by_exercise
        ]

        new_value = (
            movements_from_exercises(linked)
            if linked
            else normalize_stored_movements(stored)
        )

        if new_value != list(stored or []):
            connection.execute(
                update(complexes)
                .where(complexes.c.id == complex_id)
                .values(movements=new_value)
            )
            changed += 1

    if changed:
        connection.commit()
        logger.warning(
            "Комплексов с обновлёнными типами движения: %s", changed
        )

    return changed


def _run_migrations() -> None:
    """
    Лёгкие ручные миграции для полей, добавленных в модели уже после
    того, как база на проде существовала. create_all() (см. ниже)
    создаёт только отсутствующие ТАБЛИЦЫ целиком — если таблица уже
    есть, но в модели у неё появилась новая колонка, create_all() эту
    колонку не добавит, и сервер будет падать при первом же обращении
    к ней.

    Безопасно вызывать многократно — если колонка уже есть, ничего не
    делает. На новой пустой базе тоже безопасно: create_all() к этому
    моменту уже создал таблицу сразу с этой колонкой, так что миграция
    просто увидит, что колонка есть, и ничего не станет делать.

    В отличие от более крупных изменений схемы (например, удаления
    NOT NULL колонки без значения по умолчанию — см. комментарий у
    ComplexDB.difficulty в models_complex.py), ДОБАВЛЕНИЕ колонки со
    значением по умолчанию — простая и безопасная операция что на
    SQLite, что на PostgreSQL, поэтому эта функция, в отличие от
    старой версии, выполняется на обоих движках, а не только на
    SQLite.
    """
    boolean_default_false = (
        "BOOLEAN DEFAULT 0" if IS_SQLITE else "BOOLEAN NOT NULL DEFAULT false"
    )

    with engine.connect() as connection:
        existing_tables = set(inspect(connection).get_table_names())

        if "user" in existing_tables:
            _add_column_if_missing(
                connection, "user", "is_admin", boolean_default_false
            )
            _add_column_if_missing(
                connection, "user", "is_feed_restricted", boolean_default_false
            )
            _add_column_if_missing(
                connection, "user", "last_seen_at", "TIMESTAMP"
            )
            # Восстановление доступа: хеш ключа и версия сессий (см.
            # app/recovery.py и User.token_version в models.py).
            _add_column_if_missing(
                connection, "user", "recovery_key_hash", "TEXT"
            )
            _add_column_if_missing(
                connection, "user", "recovery_key_created_at", "TIMESTAMP"
            )
            _add_column_if_missing(
                connection, "user", "token_version", "INTEGER NOT NULL DEFAULT 0"
            )

        # Приватность отдельной записи (см. UX-обсуждение "Не
        # публиковать в общую ленту" / "Запись видна только мне"):
        # hide_from_feed прячет запись из вкладки "Все записи" на
        # Главной (но не из "Подписки" и не со страницы дневника
        # автора), is_private прячет её вообще отовсюду, кроме самого
        # автора и администратора. См. фильтрацию в list_workout_entries/
        # list_diary_notes и utils/homeFeed.ts на фронтенде.
        for table_name in ("workoutentry", "diarynote"):
            if table_name not in existing_tables:
                continue

            for column_name in ("hide_from_feed", "is_private"):
                _add_column_if_missing(
                    connection, table_name, column_name, boolean_default_false
                )

        # Разовая правка данных (не схемы): упражнения с убранным типом
        # движения — см. REMOVED_MOVEMENT_TYPES.
        if "exercise" in existing_tables:
            _replace_removed_movement_types(connection)

        # Связь комплекса с упражнениями из базы упражнений (см.
        # Complex.exercise_ids): новая колонка и привязка стартовых
        # комплексов к упражнениям.
        if "complex" in existing_tables:
            _add_column_if_missing(
                connection,
                "complex",
                "exercise_ids",
                "JSON DEFAULT '[]'" if IS_SQLITE else "JSON NOT NULL DEFAULT '[]'",
            )

            # Структурированная схема (см. Complex.scheme).
            _add_column_if_missing(
                connection,
                "complex",
                "scheme",
                "JSON DEFAULT '[]'" if IS_SQLITE else "JSON NOT NULL DEFAULT '[]'",
            )
            _add_column_if_missing(connection, "complex", "scheme_note", "TEXT")

            if "exercise" in existing_tables:
                _link_seed_complexes_to_exercises(connection)

            # Тип движения комплекса — типы движения его упражнений
            # (см. _refresh_complex_movements). После привязки стартовых
            # комплексов к упражнениям, чтобы учесть и её.
            if "exercise" in existing_tables:
                _refresh_complex_movements(connection)

        # Связь записи тренировки с программой (см. UX-документ
        # «Раздел Программы», models_diary.WorkoutEntry) — добавлена
        # позже, чем таблица workoutentry уже существовала на проде.
        if "workoutentry" in existing_tables:
            _add_column_if_missing(
                connection, "workoutentry", "program_id", "INTEGER"
            )
            _add_column_if_missing(
                connection, "workoutentry", "program_version_id", "INTEGER"
            )
            _add_column_if_missing(
                connection, "workoutentry", "program_section", "TEXT"
            )
            _add_column_if_missing(
                connection, "workoutentry", "program_scheme", "TEXT"
            )


def create_db_and_tables() -> None:
    """
    Создаёт таблицы в базе данных на основе всех моделей SQLModel,
    которые были импортированы к моменту вызова, подчищает схему уже
    существующих таблиц через _run_migrations() и заполняет пустые
    справочники стартовыми данными (каталог комплексов — см.
    models_complex.seed_complexes_if_empty, база упражнений — см.
    models_exercise.seed_exercises_if_empty).
    Вызывается один раз при старте приложения.
    """
    SQLModel.metadata.create_all(engine)
    _run_migrations()

    # Импорт внутри функции, а не в начале файла — чтобы не создавать
    # цикл импортов (models_complex.py ничего не импортирует из
    # database.py, но к моменту вызова этой функции при старте
    # приложения все модели уже точно загружены, так что цикла не
    # возникает в любом случае; локальный импорт здесь просто для
    # симметрии с тем, что database.py остаётся "общим" модулем, не
    # завязанным на знание о конкретных моделях на уровне файла).
    from app.models_complex import seed_complexes_if_empty
    from app.models_exercise import seed_exercises_if_empty

    with Session(engine) as session:
        seed_complexes_if_empty(session)
        seed_exercises_if_empty(session)


def get_session():
    """
    Даёт FastAPI-эндпоинтам сессию для работы с базой данных.
    Используется как Depends(get_session) — FastAPI сам вызовет эту
    функцию для каждого запроса и закроет сессию после ответа.
    """
    with Session(engine) as session:
        yield session
