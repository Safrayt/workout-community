"""
Проверки скрипта переноса SQLite -> PostgreSQL (migrate_to_postgres.py),
которым не нужен сам PostgreSQL.

Скрипт запускается один раз в жизни проекта, поэтому он легко "отстаёт"
от кода: добавили таблицу или внешний ключ — а про скрипт забыли, и об
этом узнаёшь прямо во время переезда. Эти тесты ломаются раньше, на
обычном прогоне CI. Сам перенос проверен вручную на PostgreSQL 16.
"""

import pytest
from sqlalchemy import Integer, func, select
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

import migrate_to_postgres as script
from app import database


def test_every_table_can_be_ordered_for_copying():
    """
    Все модели находятся, внешние ключи ссылаются на существующие
    таблицы, а круговых связей нет — кроме объявленных в
    CIRCULAR_FOREIGN_KEYS (иначе sort_tables выбросит ошибку).
    """
    ordered = script.sorted_tables_for_copy()

    assert {table.name for table in ordered} == set(SQLModel.metadata.tables)


def test_parents_are_copied_before_children():
    ordered = script.sorted_tables_for_copy()
    position = {table.name: index for index, table in enumerate(ordered)}

    for table in ordered:
        for foreign_key in table.foreign_keys:
            column = foreign_key.parent

            if column.name in script.CIRCULAR_FOREIGN_KEYS.get(table.name, ()):
                continue

            parent = foreign_key.column.table

            if parent is table:
                continue

            assert position[parent.name] < position[table.name], (
                f"{table.name}.{column.name} ссылается на {parent.name}, "
                "но копируется раньше неё"
            )


def test_circular_columns_exist_and_are_nullable():
    """Колонку с круговой ссылкой на время копирования обнуляем — NULL должен быть можно."""
    for table_name, columns in script.CIRCULAR_FOREIGN_KEYS.items():
        table = SQLModel.metadata.tables[table_name]

        for column in columns:
            assert table.c[column].nullable, f"{table_name}.{column}"


def test_seeded_tables_match_what_the_backend_seeds(monkeypatch):
    """
    Всё, что бэкенд сам кладёт в базу при первом старте, должно быть
    перечислено в SEEDED_TABLES: иначе после старта бэкенда эти таблицы
    не пусты, и скрипт откажется работать (или, хуже, задвоит данные).
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    monkeypatch.setattr(database, "engine", engine)

    database.create_db_and_tables()

    with Session(engine) as session:
        seeded = {
            table.name
            for table in SQLModel.metadata.tables.values()
            if session.execute(
                select(func.count()).select_from(table)
            ).scalar_one()
            > 0
        }

    assert seeded == set(script.SEEDED_TABLES)


@pytest.mark.parametrize(
    "table_name, expects_sequence",
    [
        ("user", True),
        ("program", True),
        ("notification", True),
        # id — текстовый слаг из адреса страницы, последовательности нет:
        # setval для них упал бы с ошибкой типов.
        ("article", False),
        ("exercise", False),
    ],
)
def test_sequence_reset_applies_only_to_integer_ids(
    table_name, expects_sequence
):
    id_column = SQLModel.metadata.tables[table_name].c.get("id")

    assert isinstance(id_column.type, Integer) is expects_sequence
