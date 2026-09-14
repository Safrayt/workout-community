# Образ для бэкенда (FastAPI). Собирается один раз, дальше просто
# переиспользуется — на любом сервере с Docker будет работать
# одинаково, без ручной установки Python и зависимостей.

FROM python:3.12-slim

# Не даём Python писать .pyc-файлы и буферизовать вывод — так логи
# сразу видно через `docker compose logs`, а не после накопления буфера.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Сначала копируем только requirements.txt и ставим зависимости —
# Docker кеширует этот слой, и при изменении только кода приложения
# (без изменения зависимостей) пересборка образа займёт секунды,
# а не минуты на переустановку всех пакетов заново.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Теперь копируем код приложения.
COPY app ./app

# Одноразовый скрипт переноса данных со старой SQLite-базы на
# PostgreSQL (см. DEPLOY.md, "Миграция на PostgreSQL") — тоже должен
# быть внутри образа, чтобы его можно было запустить через
# `docker compose exec backend python3 migrate_to_postgres.py`.
COPY migrate_to_postgres.py .
COPY delete_user.py .
COPY make_admin.py .

# Папка для загруженных файлов, которая должна сохраняться между
# перезапусками контейнера (см. docker-compose.yml — сюда
# подключается volume backend_uploads).
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
