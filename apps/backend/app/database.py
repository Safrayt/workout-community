import os

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import inspect

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


def create_db_and_tables() -> None:
    """
    Создаёт таблицы в базе данных на основе всех моделей SQLModel,
    которые были импортированы к моменту вызова, подчищает схему уже
    существующих таблиц через _run_migrations() и заполняет пустые
    справочники стартовыми данными (сейчас — только каталог
    комплексов, см. models_complex.seed_complexes_if_empty).
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

    with Session(engine) as session:
        seed_complexes_if_empty(session)


def get_session():
    """
    Даёт FastAPI-эндпоинтам сессию для работы с базой данных.
    Используется как Depends(get_session) — FastAPI сам вызовет эту
    функцию для каждого запроса и закроет сессию после ответа.
    """
    with Session(engine) as session:
        yield session
