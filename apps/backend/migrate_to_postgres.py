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

Порядок использования — см. DEPLOY.md, раздел "Миграция на
PostgreSQL". Коротко:
    1. Обновить docker-compose.yml/.env, поднять сервис db (Postgres).
    2. docker compose up -d --build — бэкенд подключится к Postgres
       и создаст в нём пустые таблицы по актуальным моделям.
    3. docker compose exec backend python3 migrate_to_postgres.py
    4. Проверить сайт.

Безопасно запускать повторно ТОЛЬКО на пустых таблицах в Postgres —
если что-то уже скопировано, повторный запуск упадёт на дубликатах
первичных ключей (это специально: чтобы случайно не задвоить данные).
Если нужно перезапустить с нуля — сначала очистите таблицы в Postgres
(`docker compose down -v` удалит volume Postgres целиком, включая
данные, если ещё ничего важного там нет).
"""

import sys

sys.path.insert(0, ".")

from sqlmodel import SQLModel, create_engine  # noqa: E402

# Импортируем все модули с моделями (как это делает app/main.py через
# импорт роутеров), чтобы SQLModel.metadata знала обо ВСЕХ таблицах —
# иначе будут скопированы не все данные.
from app import models  # noqa: E402,F401
from app import models_complex  # noqa: E402,F401
from app import models_diary  # noqa: E402,F401
from app import models_event  # noqa: E402,F401
from app import models_playground  # noqa: E402,F401
from app import models_review  # noqa: E402,F401
from app import models_social  # noqa: E402,F401
from app.database import DATABASE_URL, engine as pg_engine  # noqa: E402

SQLITE_PATH = "/app/data/app.db"


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

    with sqlite_engine.connect() as src, pg_engine.connect() as dst:
        # sorted_tables — таблицы в порядке, учитывающем внешние
        # ключи (сначала таблицы, на которые ссылаются другие, потом
        # уже сами ссылающиеся) — важно, иначе можно попытаться
        # вставить, например, отзыв на площадку, которой в Postgres
        # ещё нет.
        for table in SQLModel.metadata.sorted_tables:
            rows = src.execute(table.select()).mappings().all()

            if not rows:
                print(f"  {table.name}: пусто, пропускаю")
                continue

            dst.execute(table.insert(), [dict(row) for row in rows])
            print(f"  {table.name}: перенесено строк — {len(rows)}")

            # Postgres сам генерирует id для новых строк через
            # последовательность (SERIAL), которая не знает про id,
            # только что вставленные нами напрямую с конкретными
            # значениями. Без этого шага следующая же попытка создать
            # новую запись через сайт (например, добавить площадку)
            # могла бы получить id, который уже занят перенесённой
            # записью, и упасть с ошибкой. Поэтому после переноса
            # переставляем счётчик на "максимальный перенесённый id + 1".
            if "id" in table.c:
                dst.execute_driver_sql(
                    f'SELECT setval('
                    f"pg_get_serial_sequence('{table.name}', 'id'), "
                    f"COALESCE((SELECT MAX(id) FROM \"{table.name}\"), 1)"
                    f")"
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
