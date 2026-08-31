"""
Настройки, которые должны различаться между разработкой и продом,
собраны здесь в одном месте — вместо того чтобы редактировать код
(main.py, auth.py) при каждом деплое. На проде их задают через
переменные окружения (см. .env.example); без них используются
безопасные значения по умолчанию для локальной разработки.
"""

import os

from dotenv import load_dotenv

# Подхватывает .env из текущей рабочей директории (там, откуда
# запущен uvicorn), если он есть — без этого сам факт наличия файла
# .env ничего не значил бы: python не читает такие файлы сам по себе.
# На проде можно и не создавать .env вовсе, а задавать переменные
# окружения через systemd (EnvironmentFile=) — тогда load_dotenv()
# просто ничего не найдёт и не изменит уже установленные значения.
load_dotenv()

# "production" или "development" (по умолчанию). Влияет на то,
# насколько строго проверяются остальные настройки ниже.
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"

# Значение по умолчанию годится только для локальной разработки.
# В проде ОБЯЗАТЕЛЬНО задать свой ключ через переменную окружения,
# например: SECRET_KEY=$(openssl rand -hex 32)
_DEFAULT_DEV_SECRET_KEY = "dev-only-secret-change-me"
SECRET_KEY = os.environ.get("SECRET_KEY", _DEFAULT_DEV_SECRET_KEY)

if IS_PRODUCTION and SECRET_KEY == _DEFAULT_DEV_SECRET_KEY:
    # Лучше не запуститься вовсе, чем запуститься с ключом, который
    # опубликован в открытом репозитории — с ним любой может
    # подделать токен от имени любого пользователя.
    raise RuntimeError(
        "ENVIRONMENT=production, но SECRET_KEY не задан (используется "
        "значение по умолчанию для разработки). Задайте переменную "
        "окружения SECRET_KEY перед запуском в проде."
    )

if IS_PRODUCTION and len(SECRET_KEY.encode("utf-8")) < 32:
    # PyJWT сам предупреждает об этом при каждом encode/decode
    # (InsecureKeyLengthWarning) — короткий ключ снижает стойкость
    # HMAC-подписи токена к перебору. openssl rand -hex 32 даёт
    # 64-символьную строку, чего более чем достаточно.
    raise RuntimeError(
        "SECRET_KEY слишком короткий для production (меньше 32 байт). "
        "Сгенерируйте новый: openssl rand -hex 32"
    )

# Список источников (доменов фронтенда), которым разрешено обращаться
# к API из браузера. В проде — реальный домен(ы) через запятую,
# например: CORS_ORIGINS=https://streetworkout.lol,https://www.streetworkout.lol
_default_cors_origins = "http://localhost:5173,http://127.0.0.1:5173"
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", _default_cors_origins).split(",")
    if origin.strip()
]

# Домены, с которыми сервер согласится работать (защита от подмены
# заголовка Host). В проде — реальный домен(ы) через запятую,
# например: ALLOWED_HOSTS=streetworkout.lol,www.streetworkout.lol
# По умолчанию "*" (без ограничений) — только для разработки.
_default_allowed_hosts = "*"
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("ALLOWED_HOSTS", _default_allowed_hosts).split(",")
    if host.strip()
]

# Интерактивная документация (/docs, /redoc, /openapi.json) удобна
# при разработке, но на проде отдаёт наружу полную карту API —
# по умолчанию отключаем в production, можно включить явно через
# ENABLE_DOCS=true, если это осознанно нужно (например, для
# внутреннего API).
ENABLE_DOCS = (
    os.environ.get("ENABLE_DOCS", "false" if IS_PRODUCTION else "true").lower()
    == "true"
)
