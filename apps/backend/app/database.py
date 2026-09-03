import os

from sqlmodel import SQLModel, Session, create_engine

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


def _run_migrations() -> None:
    """
    Лёгкие ручные миграции для полей, добавленных в модели уже после
    того, как база на проде существовала. create_all() (см. ниже)
    создаёт только отсутствующие ТАБЛИЦЫ целиком — если таблица уже
    есть, но в модели у неё появилась новая колонка, create_all() эту
    колонку не добавит, и сервер будет падать при первом же обращении
    к ней. Здесь для каждой такой колонки проверяем, есть ли она уже
    (через PRAGMA table_info — способ SQLite посмотреть структуру
    таблицы), и добавляем через ALTER TABLE, если нет.

    Безопасно вызывать многократно — если колонка уже есть, ничего не
    делает. На новой пустой базе тоже безопасно: create_all() к этому
    моменту уже создал таблицу sразу с этой колонкой, так что миграция
    просто увидит, что колонка есть, и ничего не станет делать.

    Написана под конкретный синтаксис SQLite (PRAGMA table_info) — на
    PostgreSQL не запускается вообще, там колонка уже есть сразу после
    create_all() (это либо новая база, либо база, только что
    заполненная скриптом migrate_to_postgres.py по уже актуальным
    моделям).
    """
    if not IS_SQLITE:
        return

    with engine.connect() as connection:
        table_exists = connection.exec_driver_sql(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' AND name='user'"
        ).first()

        if table_exists is None:
            # Таблицы ещё нет вообще (самый первый запуск, до
            # create_all() выше) — мигрировать нечего, create_all()
            # создаст её сразу с нужной колонкой.
            return

        existing_columns = {
            row[1]  # PRAGMA table_info возвращает (cid, name, type, ...)
            for row in connection.exec_driver_sql(
                "PRAGMA table_info(user)"
            ).fetchall()
        }

        if "is_admin" not in existing_columns:
            connection.exec_driver_sql(
                "ALTER TABLE user ADD COLUMN is_admin BOOLEAN DEFAULT 0"
            )
            connection.commit()


def create_db_and_tables() -> None:
    """
    Создаёт таблицы в базе данных на основе всех моделей SQLModel,
    которые были импортированы к моменту вызова, и подчищает схему
    уже существующих таблиц через _run_migrations().
    Вызывается один раз при старте приложения.
    """
    SQLModel.metadata.create_all(engine)
    _run_migrations()


def get_session():
    """
    Даёт FastAPI-эндпоинтам сессию для работы с базой данных.
    Используется как Depends(get_session) — FastAPI сам вызовет эту
    функцию для каждого запроса и закроет сессию после ответа.
    """
    with Session(engine) as session:
        yield session
