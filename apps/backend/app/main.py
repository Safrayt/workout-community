from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import create_db_and_tables
from app.files import UPLOAD_ROOT, ensure_upload_dirs
from app.routers import auth, events, playgrounds, users

# Папки для загрузок должны существовать ДО того, как StaticFiles
# попробует их примонтировать (иначе будет ошибка при старте).
ensure_upload_dirs()

app = FastAPI(
    title="Workout Community API",
    version="0.1.0",
)

# Разрешаем фронтенду (Vite dev-server) обращаться к API из браузера.
# Список адресов можно будет расширить, когда появится продакшен-домен.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Отдаёт загруженные файлы напрямую по ссылке вида
# http://127.0.0.1:8000/uploads/playgrounds/<файл>.jpg
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(playgrounds.router)
app.include_router(events.router)


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
