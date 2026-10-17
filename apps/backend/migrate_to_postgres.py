"""
Одноразовый скрипт переноса данных с уже работающего сайта
(SQLite-файл) в PostgreSQL.

Когда его использовать: вы уже какое-то время работали на SQLite (в
файле /app/data/app.db внутри volume backend_data), в базе есть
реальные пользователи/площадки/etc, и вы переключаете DATABASE_URL на
PostgreSQL — этот скрипт скопирует все данные, чтобы ничего не
потерять. Если у вас ещё нет никаких реальных данных на сайте (только
что разворачиваете с нуля) — этот скрипт не нужен вообще, PostgreSQL
сразу же будет создан пустым, начинайте работать сразу в нём.

ПОСЛЕ миграции: volume backend_data и mkdir /app/data убраны из
docker-compose.yml/Dockerfile — приложение их больше не читает. Если
нужно снова добраться до старого файла SQLite (например, для сверки
исторических данных), верните строку "backend_data:/app/data" в
volumes сервиса backend в docker-compose.yml, разово перезапустите
контейнер и заберите файл через `docker compose exec backend cat
/app/data/app.db > app.db`.

Порядок использования — см. DEPLOY.md, раздел "Миграция на
PostgreSQL". Коротко:
    1. Обновить docker-compose.yml/.env, поднять сервис db (Postgres).
    2. docker compose up -d --build — бэкенд подключится к Postgres
       и создаст в нём пустые таблицы по актуальным моделям.
    3. docker compose exec backend python3 migrate_to_postgres.py
    4. Проверить сайт.

Безопасно запускать повторно ТОЛЬКО на пустых таблицах в Postgres —
если в какой-то из них уже есть данные, скрипт остановится до начала
копирования и скажет, в какой именно (это специально: чтобы случайно
не задвоить данные). Если нужно перезапустить с нуля — сначала
очистите таблицы в Postgres (`docker compose down -v` удалит volume
Postgres целиком, включая данные, если ещё ничего важного там нет).

Исключение — таблицы, которые бэкенд заполняет сам при первом старте
(упражнения и комплексы, см. SEEDED_TABLES ниже): после шага 2 в них
уже лежат стартовые данные. Данные из SQLite важнее — это и есть ваш
сайт, со всеми правками, — поэтому стартовые строки заменяются ими.
"""

import importlib
import pkgutil
import sys
import warnings

sys.path.insert(0, ".")

from sqlalchemy import Integer, and_, exc as sa_exc, func, inspect, select  # noqa: E402
from sqlalchemy.sql.ddl import sort_tables  # noqa: E402
from sqlmodel import SQLModel, create_engine  # noqa: E402

import app as app_package  # noqa: E402

# Импортируем ВСЕ модули с моделями (app/models*.py), чтобы
# SQLModel.metadata знала обо всех таблицах: иначе часть данных не
# скопируется, а таблицы, на которые ссылаются внешние ключи, "не
# найдутся" и скрипт упадёт ещё до начала копирования. Модули ищем
# сами, а не перечисляем вручную, — новый models_*.py не придётся
# добавлять сюда не забыв.
for _module in pkgutil.iter_modules(app_package.__path__):
    if _module.name.startswith("models"):
        importlib.import_module(f"app.{_module.name}")

from app.database import DATABASE_URL, engine as pg_engine  # noqa: E402

SQLITE_PATH = "/app/data/app.db"

# Таблицы, которые бэкенд заполняет стартовыми данными при первом
# запуске (см. create_db_and_tables в app/database.py): к моменту
# запуска скрипта они в Postgres уже не пустые. Если добавится новый
# seed_*_if_empty — добавьте его таблицу сюда.
SEEDED_TABLES = ("complex", "exercise")

# Круговые связи между таблицами: program.current_version_id ссылается
# на programversion, а programversion.program_id — на program, так что
# какую из двух таблиц ни копируй первой, внешний ключ нарушится. Выход:
# при вставке оставляем эту колонку пустой, а после копирования всех
# таблиц проставляем её значения. Формат: {таблица: [колонки]}.
# Колонка должна допускать NULL.
CIRCULAR_FOREIGN_KEYS = {
    "program": ["current_version_id"],
}


def sorted_tables_for_copy():
    """
    Таблицы в порядке копирования: сначала те, на которые ссылаются
    другие. Круговые связи из CIRCULAR_FOREIGN_KEYS при сортировке не
    учитываются; если появится ещё один цикл, SQLAlchemy предупредит о
    нём, и мы останавливаемся (иначе таблицы копировались бы в
    случайном порядке и вставка падала бы на внешних ключах).
    """

    def skip_foreign_key(foreign_key) -> bool:
        column = foreign_key.parent

        return column.name in CIRCULAR_FOREIGN_KEYS.get(column.table.name, ())

    with warnings.catch_warnings():
        warnings.simplefilter("error", sa_exc.SAWarning)

        return sort_tables(
            SQLModel.metadata.tables.values(), skip_fn=skip_foreign_key
        )


def main() -> None:
    if DATABASE_URL.startswith("sqlite"):
        print(
            "DATABASE_URL всё ещё указывает на SQLite. Сначала "
            "переключите его на PostgreSQL (POSTGRES_PASSWORD в .env "
            "и docker-compose.yml), выполните `docker compose up -d`, "
            "и только потом запускайте этот скрипт."
        )
        raise SystemExit(1)

    sqlite_engine = create_engine(
        f"sqlite:///{SQLITE_PATH}",
        connect_args={"check_same_thread": False},
    )

    print(f"Источник:   sqlite:///{SQLITE_PATH}")
    print(f"Назначение: {DATABASE_URL}")
    print()

    # На случай, если бэкенд ещё не успел создать таблицы в Postgres
    # (например, скрипт запущен раньше первого старта приложения).
    SQLModel.metadata.create_all(pg_engine)

    tables = sorted_tables_for_copy()
    source_tables = set(inspect(sqlite_engine).get_table_names())

    with sqlite_engine.connect() as src, pg_engine.connect() as dst:
        # 1. Проверка до любых изменений: во всех таблицах, кроме
        # заполняемых бэкендом самостоятельно, в Postgres должно быть
        # пусто — иначе перенос задвоит или перемешает данные.
        not_empty = [
            table.name
            for table in tables
            if table.name not in SEEDED_TABLES
            and dst.execute(
                select(func.count()).select_from(table)
            ).scalar_one()
            > 0
        ]

        if not_empty:
            print(
                "В Postgres уже есть данные в таблицах: "
                + ", ".join(not_empty)
                + ".\nСкрипт переносит данные только в пустую базу — "
                "иначе они бы задвоились. Очистите базу (см. описание "
                "в начале файла) и запустите скрипт снова."
            )
            raise SystemExit(1)

        deferred: list = []

        for table in tables:
            if table.name not in source_tables:
                print(f"  {table.name}: нет в SQLite, пропускаю")
                continue

            rows = [
                dict(row)
                for row in src.execute(table.select()).mappings().all()
            ]

            if not rows:
                print(f"  {table.name}: пусто, пропускаю")
                continue

            # Стартовые строки, которые бэкенд успел создать сам,
            # заменяются данными с вашего сайта.
            if table.name in SEEDED_TABLES:
                dst.execute(table.delete())

            late_columns = CIRCULAR_FOREIGN_KEYS.get(table.name, [])

            dst.execute(
                table.insert(),
                [
                    {**row, **{column: None for column in late_columns}}
                    for row in rows
                ],
            )
            print(f"  {table.name}: перенесено строк — {len(rows)}")

            if late_columns:
                deferred.append((table, late_columns, rows))

            # Postgres сам генерирует id для новых строк через
            # последовательность (SERIAL), которая не знает про id,
            # только что вставленные нами напрямую с конкретными
            # значениями. Без этого шага следующая же попытка создать
            # новую запись через сайт (например, добавить площадку)
            # могла бы получить id, который уже занят перенесённой
            # записью, и упасть с ошибкой. Поэтому после переноса
            # переставляем счётчик на "максимальный перенесённый id + 1".
            # Только для числовых id: у упражнений и статей id — текст
            # (слаг из адреса страницы), последовательности у них нет.
            id_column = table.c.get("id")

            if id_column is not None and isinstance(id_column.type, Integer):
                dst.exec_driver_sql(
                    f"SELECT setval("
                    f"pg_get_serial_sequence('\"{table.name}\"', 'id'), "
                    f"COALESCE((SELECT MAX(id) FROM \"{table.name}\"), 1)"
                    f")"
                )

        # 2. Колонки, которые мы оставили пустыми из-за круговых связей:
        # теперь все таблицы на месте, и ссылки можно проставить.
        for table, columns, rows in deferred:
            key = list(table.primary_key.columns)

            for row in rows:
                values = {
                    column: row[column]
                    for column in columns
                    if row[column] is not None
                }

                if values:
                    dst.execute(
                        table.update()
                        .where(and_(*[col == row[col.name] for col in key]))
                        .values(**values)
                    )

        dst.commit()

    print()
    print("Готово. Откройте сайт и проверьте, что данные на месте")
    print("(войдите под существующим пользователем, посмотрите площадки).")
    print(
        "Старый файл SQLite при этом никуда не делся "
        f"({SQLITE_PATH}) — можно оставить как есть на память "
        "или удалить, когда убедитесь, что всё перенеслось верно."
    )


if __name__ == "__main__":
    main()
