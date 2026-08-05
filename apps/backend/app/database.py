from sqlmodel import SQLModel, Session, create_engine

# Для разработки используем SQLite — это просто файл на диске,
# не требует установки отдельного сервера базы данных.
# Файл появится в apps/backend после первого запуска и в git не попадёт
# (см. .gitignore).
DATABASE_URL = "sqlite:///./app.db"

# connect_args нужен только для SQLite: по умолчанию SQLite разрешает
# работу с соединением только из того потока, где оно было создано,
# а FastAPI может обращаться к базе из разных потоков.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


def create_db_and_tables() -> None:
    """
    Создаёт таблицы в базе данных на основе всех моделей SQLModel,
    которые были импортированы к моменту вызова.
    Вызывается один раз при старте приложения.
    """
    SQLModel.metadata.create_all(engine)


def get_session():
    """
    Даёт FastAPI-эндпоинтам сессию для работы с базой данных.
    Используется как Depends(get_session) — FastAPI сам вызовет эту
    функцию для каждого запроса и закроет сессию после ответа.
    """
    with Session(engine) as session:
        yield session
