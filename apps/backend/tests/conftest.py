"""
Общие фикстуры для всех тестов.

Переменные окружения выставляются ДО первого импорта чего-либо из
app.* — app/config.py читает их при импорте модуля, а не при каждом
обращении, так что если опоздать с этим, тесты подхватят настройки
из реального .env разработчика (или упадут, если его вообще нет).
"""

import os

os.environ["SECRET_KEY"] = "test-secret-key-only-for-pytest-do-not-use-anywhere-else"
os.environ["ENVIRONMENT"] = "development"

# Явно, а не через setdefault: иначе python-dotenv (см. app/config.py)
# подхватит реальный .env проекта, если он существует на машине, где
# запускаются тесты — а там ALLOWED_HOSTS/CORS_ORIGINS могут быть
# пустыми или указывать на боевой домен. Тесты не должны зависеть от
# того, что лежит в .env у конкретного разработчика или в CI.
os.environ["ALLOWED_HOSTS"] = "*"
os.environ["CORS_ORIGINS"] = "http://testserver"

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.database import get_session
from app.main import app


@pytest.fixture(name="session")
def session_fixture():
    """
    Отдельная SQLite-база в памяти на каждый тест — полная изоляция
    без необходимости чистить состояние между тестами вручную.

    StaticPool держит одно и то же соединение для всех обращений к
    этому engine: обычная SQLite-in-memory база живёт ровно столько,
    сколько живёт создавшее её соединение, а без StaticPool каждый
    новый запрос через Depends(get_session) открывал бы новое
    соединение — и, следовательно, каждый раз видел бы пустую базу.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Каталог комплексов раньше был статичным списком в коде —
        # теперь таблица (см. models_complex.py), и "Схема Ганнибала"
        # существует только если её кто-то туда положил. seed делает
        # ровно то же самое, что происходит на реальном старте
        # приложения (см. database.create_db_and_tables) — так тесты
        # не расходятся с поведением прода.
        from app.models_complex import seed_complexes_if_empty

        seed_complexes_if_empty(session)
        session.commit()

    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """
    TestClient с подменённой зависимостью get_session — эндпоинты
    работают с той же in-memory базой, что и фикстура session выше,
    вместо настоящей DATABASE_URL.
    """

    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    """
    RateLimiter (app/rate_limit.py) хранит счётчики попыток в памяти
    модуля-синглтона, а не в БД — поэтому session/client-фикстуры выше
    его не сбрасывают. Без этой фикстуры тесты логина/регистрации,
    которых в файле больше, чем разрешённый лимит попыток, начинают
    падать с 429 просто потому, что все запросы в TestClient идут
    "с одного и того же IP", а не потому что где-то реальный баг.
    """
    from app.routers.auth import _login_rate_limit, _register_rate_limit

    _login_rate_limit._hits.clear()
    _register_rate_limit._hits.clear()

    yield


def register_user(
    client: TestClient,
    nickname: str = "alice",
    password: str = "password123",
) -> dict:
    """
    Регистрирует пользователя и возвращает {"nickname", "password",
    "token"} — общий помощник, чтобы не дублировать один и тот же
    запрос в каждом тесте, где просто нужен "какой-то залогиненный
    пользователь".
    """
    response = client.post(
        "/auth/register",
        json={"nickname": nickname, "password": password},
    )
    assert response.status_code == 200, response.text

    return {
        "nickname": nickname,
        "password": password,
        "token": response.json()["access_token"],
    }


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
