"""Миграция: колонки системы опыта удаляются из уже существующей базы."""

from sqlalchemy import create_engine, inspect

from app.database import _drop_column_if_exists


def test_drop_column_if_exists_removes_column_and_is_repeatable():
    engine = create_engine("sqlite://")

    with engine.connect() as connection:
        connection.exec_driver_sql(
            'CREATE TABLE "user" (id INTEGER PRIMARY KEY, '
            "nickname TEXT, experience INTEGER NOT NULL)"
        )

        _drop_column_if_exists(connection, "user", "experience")
        _drop_column_if_exists(connection, "user", "experience")

        columns = {c["name"] for c in inspect(connection).get_columns("user")}

    assert columns == {"id", "nickname"}
