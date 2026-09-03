#!/usr/bin/env bash
set -euo pipefail

# Восстановление базы данных из дампа, сделанного backup.sh.
#
# ВНИМАНИЕ: полностью заменяет текущие данные в базе. Используйте
# только когда уверены, что это нужно (авария, перенос на новый
# сервер) — скрипт попросит подтверждение перед тем, как что-то делать.
#
# Использование:
#   ./restore.sh backups/db_2026-09-03_03-00-00.sql.gz [путь_к_проекту]

if [ "${1:-}" = "" ]; then
    echo "Использование: $0 путь_к_дампу.sql.gz [путь_к_проекту]" >&2
    exit 1
fi

DUMP_FILE="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${2:-$SCRIPT_DIR/..}"

if [ ! -f "$DUMP_FILE" ]; then
    echo "Файл не найден: $DUMP_FILE" >&2
    exit 1
fi

cd "$PROJECT_DIR"

echo "Это ЗАМЕНИТ все текущие данные в базе на содержимое:"
echo "  $DUMP_FILE"
read -rp "Продолжить? Наберите 'yes' для подтверждения: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Отменено."
    exit 0
fi

echo "Останавливаю backend, чтобы он не писал в базу во время восстановления..."
docker compose stop backend

echo "Восстанавливаю базу данных..."
gunzip -c "$DUMP_FILE" | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'

echo "Запускаю backend обратно..."
docker compose start backend

echo "Готово. Проверьте сайт и логи: docker compose logs -f backend"
