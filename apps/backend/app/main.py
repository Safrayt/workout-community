from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import ALLOWED_HOSTS, CORS_ORIGINS, ENABLE_DOCS
from app.database import create_db_and_tables
from app.files import UPLOAD_ROOT, ensure_upload_dirs
from app.routers import (
    achievements,
    auth,
    complexes,
    diary,
    events,
    playgrounds,
    reviews,
    social,
    users,
)

# Папки для загрузок должны существовать ДО того, как StaticFiles
# попробует их примонтировать (иначе будет ошибка при старте).
ensure_upload_dirs()

app = FastAPI(
    title="Workout Community API",
    version="0.1.0",
    # На проде по умолчанию выключено (см. ENABLE_DOCS в config.py) —
    # незачем отдавать всем желающим полную карту API.
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
)

# Защита от подмены заголовка Host (например, для отравления кэша
# или ссылок для сброса пароля, если такие появятся в будущем).
# В разработке ALLOWED_HOSTS по умолчанию "*" — без ограничений.
app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)

# Разрешаем фронтенду обращаться к API из браузера. Список адресов
# берётся из переменной окружения CORS_ORIGINS (см. config.py) —
# на локальной разработке это Vite dev-server, на проде — реальный
# домен(ы), заданные при деплое.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Базовые заголовки безопасности уровня приложения — как
    дополнительный слой поверх того, что при деплое настраивается в
    nginx (HSTS туда и относится: имеет смысл только когда HTTPS уже
    гарантированно работает, поэтому здесь не выставляется).
    """
    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    return response


# Отдаёт загруженные файлы напрямую по ссылке вида
# http://127.0.0.1:8000/uploads/playgrounds/<файл>.jpg
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(playgrounds.router)
app.include_router(events.router)
app.include_router(diary.router)
app.include_router(reviews.router)
app.include_router(achievements.router)
app.include_router(social.router)
app.include_router(complexes.router)


@app.on_event("startup")
def on_startup() -> None:
    """
    Выполняется один раз при старте сервера.
    Создаёт файл базы данных и таблицы, если их ещё нет
    (на уже существующие таблицы не влияет).
    """
    create_db_and_tables()


@app.get("/health")
def health_check() -> dict[str, str]:
    """
    Простейший эндпоинт, чтобы убедиться, что сервер запущен и отвечает.
    Используется для проверки при разработке и для мониторинга в будущем.
    """
    return {"status": "ok"}
