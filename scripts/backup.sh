#!/usr/bin/env bash
set -euo pipefail

# Бэкап PostgreSQL и загруженных файлов (фото площадок/мероприятий)
# на сервере, где выполняется docker compose. Рассчитан на запуск по
# cron — см. scripts/README.md рядом за инструкцией по настройке.
# НЕ предназначен для запуска на локальной машине разработки.
#
# Использование: ./backup.sh [путь_к_проекту_с_docker-compose.yml]
# Если путь не передан, берётся директория на уровень выше этого
# скрипта (предполагается, что скрипт лежит в scripts/ внутри проекта).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${1:-$SCRIPT_DIR/..}"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

cd "$PROJECT_DIR"
mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Бэкап базы данных..."

# -T отключает псевдо-tty у docker compose exec — без него бинарный
# вывод pg_dump будет испорчен. POSTGRES_USER/POSTGRES_DB берутся из
# окружения САМОГО контейнера db (см. environment в docker-compose.yml),
# а не с этой машины — так скрипт работает, даже если у него нет
# доступа к .env хоста.
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
    | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

if [ ! -s "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz" ]; then
    echo "[$TIMESTAMP] ОШИБКА: дамп базы данных получился пустым — что-то пошло не так." >&2
    rm -f "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
    exit 1
fi

echo "[$TIMESTAMP] Бэкап загруженных файлов..."

docker compose exec -T backend tar czf - -C /app/uploads . \
    > "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"

echo "[$TIMESTAMP] Удаление бэкапов старше $KEEP_DAYS дней..."

find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime "+$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime "+$KEEP_DAYS" -delete

echo "[$TIMESTAMP] Готово: db_${TIMESTAMP}.sql.gz, uploads_${TIMESTAMP}.tar.gz"
